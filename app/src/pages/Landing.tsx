import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { BookPreview } from '../landing/BookPreview';
import { Demo } from '../landing/Demo';
import { Hero } from '../landing/Hero';
import { Rail } from '../landing/Rail';
import { Architecture, Commitments, Faq, HowSteps, Lineage, Roadmap, SiteFooter, Thesis, Token } from '../landing/Sections';

export default function Landing() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <Rail />
      <main id="main">
        <Hero />
        <Thesis />
        <HowStepsWithDemo />
        <Architecture />
        <section className="section" id="book">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">The Book</p>
              <h2>Burn to speak.</h2>
              <p>A public record where posting has a cost and authorship cannot be proven.</p>
            </div>
            <div className="sec-body">
              <div className="prose">
                <p>Snowmoon has a wall where speech is paid for in burned zipcoins. Zipcoin’s Book is that wall. To post, you burn ZC from inside the pool. The message is public and permanent. The author is not, because the burn is a withdrawal like any other and the proof says nothing about the note that paid for it.</p>
                <p>The Doorstep is the same mechanism aimed at one address. Leave a line at a specific address, with a minimum burn to deter spam. Nothing on the Book or the Doorstep can be edited, deleted or attributed.</p>
              </div>
              <BookPreview />
            </div>
          </div>
        </section>
        <Roadmap />
        <Token />
        <Commitments />
        <Lineage />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}

/** The HowSteps section ends after the steps; the live receipt demo slots in beneath them. */
function HowStepsWithDemo() {
  return (
    <div className="how-with-demo">
      <HowSteps />
      <style>{`.how-with-demo .section{border-bottom:0;padding-bottom:0}.how-with-demo .demo-wrap{border-bottom:1px solid var(--line);padding-bottom:clamp(4rem,8vw,7.5rem)}`}</style>
      <div className="demo-wrap">
        <div className="wrap">
          <div style={{ gridColumn: '5 / 13' }} className="demo-col">
            <Demo />
          </div>
        </div>
      </div>
    </div>
  );
}
