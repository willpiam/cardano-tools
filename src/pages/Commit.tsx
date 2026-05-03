import CommitWizard from '../components/CommitWizard';
import '../simple.css';

const Commit = () => {
  return (
    <div className="commit-page">
      <div className="commit-page-inner">
        <div className="title-container">
          <div className="title">Written in Stone</div>
          <div className="subtext">a commitment tool from $computerman</div>
        </div>
        <p className="description">
          Anchor your words, files, or proofs directly on <strong>Cardano</strong> or
          <strong> Ethereum</strong>. Plain text, a hash, an encrypted secret, or a file
          fingerprint &mdash; each commitment is permanent and comes with a downloadable
          receipt. Free to use; an optional ADA tip helps fund the tool.
        </p>
        <CommitWizard />
      </div>
      <div className="bottom-area">
        <div className="bottom-area-item">
          <a href="https://github.com/willpiam/cardano-tools" target="_blank" rel="noopener noreferrer">
            Source Code
          </a>
        </div>
        <div className="bottom-area-item">
          <a href="https://projects.williamdoyle.ca" target="_blank" rel="noopener noreferrer">
            My Other Projects
          </a>
        </div>
      </div>
    </div>
  );
};

export default Commit;
