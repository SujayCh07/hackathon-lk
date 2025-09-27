export default function SocialButtons() {
  const shareToX = () => {
    const text = encodeURIComponent("Check out my PPP Passport! 🌍💸");
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={shareToX}
        className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        Share on X
      </button>
      <button
        type="button"
        onClick={shareToLinkedIn}
        className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
      >
        Share on LinkedIn
      </button>
    </div>
  );
}
