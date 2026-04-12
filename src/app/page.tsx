export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-navy-500 mb-4">
          AI RSL Platform
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          One platform. Every sector. Every scale. Fully AI-driven.
        </p>
        <a
          href="/onboarding"
          className="inline-block bg-brand-500 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-brand-700 transition"
        >
          Get Started
        </a>
      </div>
    </main>
  );
}
