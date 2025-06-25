import { Link } from 'react-router';
import Logo from '../components/Logo';
import {
  Twitter,
  Github,
  MessageSquare,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { paymentCredentialOf } from '@lucid-evolution/lucid';
import { AdminModal } from './AdminModal';

const Footer = () => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const spendingCredential = walletAddress
    ? paymentCredentialOf(walletAddress).hash
    : null;
  const isAdmin = spendingCredential === process.env.REACT_APP_ADMIN_CREDENTIAL;

  const handleAdminClick = () => {
    setIsAdminModalOpen(true);
  };

  return (
    <footer className="border-t border-primary/10 bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-muted-foreground">
              Privacy-focused mixing protocol for the Cardano blockchain.
            </p>
            <div className="flex space-x-4">
              <SocialLink
                href="https://x.com/turnprotocol"
                icon={<Twitter className="h-5 w-5" />}
              />
              {/* <SocialLink
                href="https://github.com/turn-privacy"
                icon={<Github className="h-5 w-5" />}
              /> */}
              <SocialLink
                href="https://discord.com/invite/4BTgMb9BBB"
                icon={<MessageSquare className="h-5 w-5" />}
              />
              {/* <SocialLink
                href="https://medium.com/@networkturn"
                icon={<BookOpen className="h-5 w-5" />}
              /> */}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/mix">Mix</FooterLink>
              {/* <FooterLink to="/pools">Pools</FooterLink> */}
              {/* <FooterLink to="/docs">Documentation</FooterLink> */}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  to="https://x.com/turnprotocol/status/1902750371447029839?s=46&t=X1sJLYL6zORh4pcBGIlQCw"
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  to="https://drive.google.com/file/d/1-G__NbHL-qyRW9O5pIOj3qKU48AfzKQx/view"
                >
                  Presentation
                </Link>
              </li>
              <li>
                <Link
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  to="https://medium.com/@networkturn/litepaper-n-1f903bda83d3"
                >
                  Litepaper
                </Link>
              </li>
              {/* <FooterLink to="/privacy">Privacy Policy</FooterLink> */}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  className="text-muted-foreground hover:text-primary transition-colors"
                  to="https://x.com/turnprotocol"
                  target="_blank"
                >
                  Twitter
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground hover:text-primary transition-colors"
                  to="https://discord.com/invite/4BTgMb9BBB"
                  target="_blank"
                >
                  Discord
                </Link>
              </li>
              {/* <FooterLink to="/community">Join Community</FooterLink>
              <FooterLink to="/governance">Governance</FooterLink>
              <FooterExternalLink href="https://cardano.org">
                Cardano Foundation
              </FooterExternalLink>
              <FooterExternalLink href="https://forum.cardano.org">
                Cardano Forum
              </FooterExternalLink> */}
              {isAdmin && (
                <li>
                  <button
                    onClick={handleAdminClick}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Admin Portal
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-primary/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div>
            © {new Date().getFullYear()} Turn Network. All rights reserved.
          </div>
          <div className="mt-4 md:mt-0">
            Built with <span className="gradient-text">♥</span> for privacy on
            Cardano
          </div>
        </div>
      </div>
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </footer>
  );
};

const SocialLink = ({
  href,
  icon,
}: {
  href: string;
  icon: React.ReactNode;
}) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-foreground hover:bg-primary/10 hover:border-primary/40 transition-colors"
    >
      {icon}
    </a>
  );
};

const FooterLink = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => {
  return (
    <li>
      <Link
        to={to}
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        {children}
      </Link>
    </li>
  );
};

const FooterExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors flex items-center"
      >
        {children}
        <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </li>
  );
};

export default Footer;
