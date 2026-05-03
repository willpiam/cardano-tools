import CommitWizard from '../components/CommitWizard';
import '../simple.css';

const Commit = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-10 gap-4">
        <div className="title-container">
          <div className="title">
            Written in Stone
          </div>
          <div className="subtext">
            a commitment tool from the $computerman 
          </div>
        </div>
        <div className="description">
          <p>
            This is a free tool that lets anyone anchor their words, 
            files, or proofs directly on Cardano or Ethereum. You 
            can record plain text, commit a hash, encrypt a secret, 
            or timestamp a file. Each action creates a receipt with 
            an explorer link and other relevant details. The tool 
            is free to use, and if you'd like, you can include an 
            optional Cardano tip to support ongoing development of this tool 
            and my other activities within the ecosystem.
            <br/>
            Write something down <strong>forever</strong>. 
          </p>
        </div>
        <CommitWizard />
      </div>
      {/* <footer> */}
      <div className="bottom-area">
        {/* link to https://github.com/willpiam/cardano-tools */}
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
    </>
  );
};

export default Commit;
