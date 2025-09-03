import logo from '/images/chatLogo.jpg';

export default function Greeting() {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold text-black mb-2">Hi, I'm Tilda!</h2>
      <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
        Ask me about leave insights, and I'll get you<br />
        the info you need.
      </p>
    </div>
  );
}
