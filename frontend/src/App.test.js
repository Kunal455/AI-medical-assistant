import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home page details', () => {
  render(<App />);
  const element = screen.getByText(/Private by design/i);
  expect(element).toBeInTheDocument();
});