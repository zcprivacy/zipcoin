import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer pad">
      <div className="about">
        <b>Zipcoin</b>
        <p>Private money for a public chain. A shielded pool for ETH and any token on Ethereum, built in the open from the ideas in Snowmoon.</p>
      </div>
      <div className="colz">
        <span className="h">On-chain</span>
        <a href="https://etherscan.io/address/0x7959a703F49B2d0baa29978c2A126076a0150190#code" target="_blank" rel="noopener">Entrypoint</a>
        <a href="https://etherscan.io/address/0x316E560405D221a01107392A7C1650916dd38F39#code" target="_blank" rel="noopener">ZC pool</a>
        <a href="https://etherscan.io/address/0xfFa010d4106f20e58058909b612f75668Ae3764e#code" target="_blank" rel="noopener">The Book</a>
        <a href="https://etherscan.io/address/0x8b72E65392ac44E30E50f7799EC8fe0585F3fD72#code" target="_blank" rel="noopener">The Doorstep</a>
        <a href="https://etherscan.io/token/0xA2f6441c4839A7fD4eF8536b971ceD04c48A1CEA" target="_blank" rel="noopener">ZC on Etherscan</a>
        <a href="https://etherstreet.fun/t/0xa2f6441c4839a7fd4ef8536b971ced04c48a1cea" target="_blank" rel="noopener">Buy ZC on etherstreet.fun</a>
      </div>
      <div className="colz">
        <span className="h">Channels</span>
        <a href="https://github.com/zcprivacy/zipcoin" target="_blank" rel="noopener">GitHub: zcprivacy/zipcoin</a>
        <a href="https://x.com/zcprivacy" target="_blank" rel="noopener">X: @zcprivacy</a>
        <span className="muted">Announcements: listed here first</span>
        <span className="muted">Channels not listed here are not affiliated with Zipcoin.</span>
      </div>
      <div className="colz">
        <span className="h">Docs</span>
        <Link to="/docs#how">How it works</Link>
        <Link to="/docs#hook">ZipHook</Link>
        <Link to="/docs#roadmap">Roadmap</Link>
        <Link to="/docs#token">Token and treasury</Link>
        <Link to="/docs#faq">FAQ</Link>
        <a href="https://github.com/zcprivacy/zipcoin/tree/main/docs" target="_blank" rel="noopener">Specification and trust model</a>
      </div>
      <div className="small">
        <span>Zipcoin · zipcoin.zip · An independent project. Not affiliated with Vitalik Buterin, the Ethereum Foundation, 0xbow or the earlier zipcoin project.</span>
        <span>No analytics. No trackers. Snowmoon © Vitalik Buterin, GPL v3.</span>
      </div>
    </footer>
  );
}
