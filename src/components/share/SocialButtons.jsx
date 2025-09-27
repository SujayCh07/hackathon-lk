import Button from '../ui/Button.jsx';

export function SocialButtons({ summaryRef }) {
  const shareText = 'My PPP Passport shows where my dollars stretch the furthest. ✈️';
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ppp-pocket.example';

  const shareTo = (network) => {
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(shareText);
    let target = '';
    if (network === 'twitter') {
      target = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    } else if (network === 'linkedin') {
      target = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    } else if (network === 'copy') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      }
      return;
    }
    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer,width=600,height=700');
    }
  };

  const nativeShare = async () => {
    if (navigator.share && summaryRef?.current) {
      await navigator.share({ title: 'PPP Passport', text: shareText, url: shareUrl });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button variant="secondary" onClick={() => shareTo('twitter')}>
        Share to X
      </Button>
      <Button variant="secondary" onClick={() => shareTo('linkedin')}>
        Share to LinkedIn
      </Button>
      <Button variant="ghost" onClick={() => shareTo('copy')}>
        Copy link
      </Button>
      <Button variant="secondary" onClick={nativeShare}>
        Quick share
      </Button>
    </div>
  );
}

export default SocialButtons;
