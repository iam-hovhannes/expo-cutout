import { Platform } from 'react-native';

import { getExpoCutoutModule } from './ExpoCutoutModule';
import { cutout } from './cutout';

jest.mock('./ExpoCutoutModule', () => ({
  getExpoCutoutModule: jest.fn(() => ({
    cutout: jest.fn(async () => ({ uri: 'file:///tmp/cutout.png', width: 1, height: 1 })),
  })),
}));

const mockedGetModule = getExpoCutoutModule as jest.MockedFunction<typeof getExpoCutoutModule>;

describe('cutout JS guards', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('throws on non-iOS before touching native', async () => {
    Platform.OS = 'android';

    await expect(cutout('file:///tmp/photo.jpg')).rejects.toThrow(
      /only supported on iOS 17\+.*android/
    );
    expect(mockedGetModule).not.toHaveBeenCalled();
  });

  it('throws on empty uri before native', async () => {
    Platform.OS = 'ios';

    await expect(cutout('')).rejects.toThrow(/non-empty/);
    await expect(cutout('   ')).rejects.toThrow(/non-empty/);
    expect(mockedGetModule).not.toHaveBeenCalled();
  });

  it('throws on remote URL before native', async () => {
    Platform.OS = 'ios';

    await expect(cutout('https://example.com/photo.jpg')).rejects.toThrow(/Remote URLs/);
    expect(mockedGetModule).not.toHaveBeenCalled();
  });
});
