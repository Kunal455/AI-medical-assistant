import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }) {
    return <>{children}</>;
  };
});
