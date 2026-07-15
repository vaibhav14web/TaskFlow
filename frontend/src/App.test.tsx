import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TaskFlow title', async () => {
  render(<App />);
  const buttons = await screen.findAllByRole('button', { name: /sign in/i });
  expect(buttons.length).toBeGreaterThan(0);
});
