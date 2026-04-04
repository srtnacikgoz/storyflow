export default function APIInfoSection() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">API Bilgileri</h2>

      <div className="space-y-3">
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">Region</span>
          <span className="font-medium font-mono text-sm">europe-west1</span>
        </div>
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">Project ID</span>
          <span className="font-medium font-mono text-sm">instagram-automation-ad77b</span>
        </div>
      </div>
    </div>
  );
}
