export default function SocialButtons({ summaryRef }) {
  const shareToX = () => {
    const text = encodeURIComponent("Check out my PPP Passport! See where my dollars stretch the furthest 🌍💸");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const text = encodeURIComponent("I just discovered where my money goes the furthest with PPP Passport.");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={shareToX}
        className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        Share on X
      </button>
      <button
        onClick={shareToLinkedIn}
        className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
      >
        Share on LinkedIn
      </button>
    </div>
  );
}
