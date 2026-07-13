import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TaskFlow title', () => {
  render(<App />);
  const titleElement = screen.getByText(/TaskFlow/i);
  expect(titleElement).toBeInTheDocument();
});
