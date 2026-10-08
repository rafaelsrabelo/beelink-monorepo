// App
import { customDomainSettingsOf } from './custom-domain.settings.js';

describe('customDomainSettingsOf', () => {
  it("names the server's addresses, the probe and the platform's host — the host alone, with no port", () => {
    expect(customDomainSettingsOf({ SHOP_DOMAIN_TARGET_IPS: ['161.97.70.106'], SHOP_DOMAIN_PROBE: true, WEB_URL: 'https://beelink.biz' })).toEqual({
      targetIps: ['161.97.70.106'],
      probe: true,
      platformHost: 'beelink.biz',
    });
    expect(customDomainSettingsOf({ SHOP_DOMAIN_TARGET_IPS: ['127.0.0.1'], SHOP_DOMAIN_PROBE: false, WEB_URL: 'http://localhost:3800' })).toEqual({
      targetIps: ['127.0.0.1'],
      probe: false,
      platformHost: 'localhost',
    });
  });

  it('says there are no addresses where the deployment names none', () => {
    expect(customDomainSettingsOf({ SHOP_DOMAIN_TARGET_IPS: undefined, SHOP_DOMAIN_PROBE: true, WEB_URL: 'https://beelink.biz' }).targetIps).toBeNull();
  });
});
