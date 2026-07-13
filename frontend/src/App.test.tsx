import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TaskFlow title', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /sign in/i }).length).toBeGreaterThan(0);
});
