import { parseChannelReference } from './channel-reference';

describe('parseChannelReference', () => {
  it.each([
    ['@BepNhaMinh', { handle: '@BepNhaMinh' }],
    ['BepNhaMinh', { handle: '@BepNhaMinh' }],
    ['https://www.youtube.com/@BepNhaMinh/videos', { handle: '@BepNhaMinh' }],
    ['https://m.youtube.com/@bếpnhàmình', { handle: '@bếpnhàmình' }],
    ['https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv', { id: 'UCabcdefghijklmnopqrstuv' }],
    ['UCabcdefghijklmnopqrstuv', { id: 'UCabcdefghijklmnopqrstuv' }],
  ])('reads %s', (input, expected) => {
    expect(parseChannelReference(input)).toEqual(expected);
  });

  it('refuses text that is not a channel', () => {
    expect(parseChannelReference('bếp nhà mình')).toBeNull();
    expect(parseChannelReference('')).toBeNull();
  });
});
