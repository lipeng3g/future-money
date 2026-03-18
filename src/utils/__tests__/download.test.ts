import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadTextFile } from '@/utils/download';

// Mock DOM APIs
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

const mockLink = {
  href: '',
  download: '',
  style: { display: '' },
  click: mockClick,
};

const mockDocument = {
  createElement: vi.fn(() => mockLink),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
};

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });

  vi.stubGlobal('document', mockDocument);

  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('downloadTextFile', () => {
  it('should create a blob with correct content type', () => {
    const content = 'test content';
    const contentType = 'text/plain';

    downloadTextFile('test.txt', content, contentType);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: contentType,
      }),
    );
  });

  it('should set link href to blob URL', () => {
    downloadTextFile('test.txt', 'content', 'text/plain');

    expect(mockLink.href).toBe('blob:http://localhost/mock-url');
  });

  it('should set link download attribute', () => {
    downloadTextFile('my-file.csv', 'data', 'text/csv');

    expect(mockLink.download).toBe('my-file.csv');
  });

  it('should append link to document body', () => {
    downloadTextFile('test.txt', 'content', 'text/plain');

    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
  });

  it('should click the link', () => {
    downloadTextFile('test.txt', 'content', 'text/plain');

    expect(mockClick).toHaveBeenCalled();
  });

  it('should remove link from document body after click', () => {
    downloadTextFile('test.txt', 'content', 'text/plain');

    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });

  it('should revoke object URL after timeout', () => {
    downloadTextFile('test.txt', 'content', 'text/plain');

    // Before timeout, URL should not be revoked
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    // Advance timers to trigger setTimeout callback
    vi.advanceTimersByTime(1);

    // After timeout, URL should be revoked
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
  });

  it('should handle special characters in filename', () => {
    downloadTextFile('report (2024).txt', 'content', 'text/plain');

    expect(mockLink.download).toBe('report (2024).txt');
  });

  it('should handle empty content', () => {
    downloadTextFile('empty.txt', '', 'text/plain');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
      }),
    );
  });

  it('should handle binary content', () => {
    const binaryContent = '\x00\x01\x02\x03';
    downloadTextFile('binary.dat', binaryContent, 'application/octet-stream');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});