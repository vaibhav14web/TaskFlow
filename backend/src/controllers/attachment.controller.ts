import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import config from '../utils/config';
import logger from '../utils/logger';

// Allowed MIME types mapped by extension group
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

// Magic byte signatures for content-based validation (first bytes of file)
const MAGIC_SIGNATURES: [number, number[]][] = [
  [0, [0xFF, 0xD8, 0xFF]],          // JPEG
  [0, [0x89, 0x50, 0x4E, 0x47]],    // PNG
  [0, [0x47, 0x49, 0x46, 0x38]],    // GIF (GIF8/9)
  [0, [0x25, 0x50, 0x44, 0x46]],    // PDF
  [0, [0x50, 0x4B, 0x03, 0x04]],    // ZIP / DOCX / XLSX
  [0, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],  // DOC / XLS (OLE2)
];

const validateFileMagicBytes = (filePath: string): boolean => {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  return MAGIC_SIGNATURES.some(([offset, expected]) =>
    expected.every((byte, i) => buffer[offset + i] === byte)
  );
};

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to the backend/uploads directory
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique name: timestamp + random + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|zip|doc|docx|xls|xlsx|txt/i;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.test(ext)) {
      cb(new Error('Invalid file type. Allowed types: images, PDF, zip, DOC/X, XLS/X, TXT.'));
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Invalid file MIME type.'));
      return;
    }
    cb(null, true);
  }
});

// 1. Add Attachment (Member+)
// POST /tasks/:id/attachments
export const addAttachment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const userId = req.userId;
    const file = req.file;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!file) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    // Verify Member+ permissions
    const workspaceId = task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Validate file content via magic bytes (skip for .txt which has no signature)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.txt') {
      const filePath = path.join(__dirname, '../../uploads', file.filename);
      if (!validateFileMagicBytes(filePath)) {
        fs.unlinkSync(filePath);
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'File content does not match its extension.' } });
        return;
      }
    }

    const fileUrl = `/uploads/${file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size
      }
    });

    // Log attachment activity
    await prisma.activityLog.create({
      data: {
        taskId,
        userId,
        action: `uploaded attachment '${file.originalname}'`
      }
    });

    res.status(201).json({ data: attachment });
  } catch (error) {
    next(error);
  }
};

// 2. Get Attachments (Viewer+)
// GET /tasks/:id/attachments
export const getAttachments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { uploadedAt: 'desc' }
    });

    res.status(200).json({ data: attachments });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Attachment (Member+)
// DELETE /attachments/:id
export const deleteAttachment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            column: {
              include: {
                board: {
                  include: {
                    project: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found.' } });
      return;
    }

    const workspaceId = attachment.task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    await prisma.attachment.delete({
      where: { id }
    });

    // Delete the physical file from disk to prevent orphaned files accumulating
    try {
      const filePath = path.join(__dirname, '../../', attachment.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (_err) {
      logger.warn({ attachmentId: id, fileUrl: attachment.fileUrl }, 'Could not delete physical file for attachment');
    }

    // Log deletion activity
    await prisma.activityLog.create({
      data: {
        taskId: attachment.taskId,
        userId,
        action: `deleted attachment '${attachment.fileName}'`
      }
    });

    res.status(200).json({ data: { message: 'Attachment deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

