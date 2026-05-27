export async function onRequest(context) {
  // রেসপন্স হেডার্স (CORS সম্পূর্ণ ওপেন করে দেওয়া হলো)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // এখানে আমরা একটি বড় কিন্তু লাইটওয়েট সোর্স ব্যবহার করছি যাতে ব্রাউজার ক্র্যাশ না করে
    const sourceUrl = "https://iptv-org.github.io/iptv/countries/bd.m3u"; // প্রথমে টেস্টের জন্য বাংলাদেশ সোর্স দিন

    // ক্লাউডফ্লেয়ার সার্ভার থেকে গিটহাবের ফাইলটি রিকোয়েস্ট করা হচ্ছে (এর ফলে CORS এরর হবে না)
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from source: ${response.status}`);
    }

    const m3uText = await response.text();
    const parsedChannels = parseM3U(m3uText);

    // শুধু প্রথম ১০০টি চ্যানেল রিটার্ন করুন (টেস্ট করার জন্য এবং সাইট ফাস্ট রাখার জন্য)
    const limitedChannels = parsedChannels.slice(0, 150);

    return new Response(JSON.stringify({ channels: limitedChannels }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, channels: [] }), {
      status: 500,
      headers
    });
  }
}

// M3U Parser Function
function parseM3U(m3uText) {
  const lines = m3uText.split("\n");
  const channels = [];
  let currentChannel = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF:")) {
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : "Live Channel";

      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : "https://via.placeholder.com/150?text=TV";

      const groupMatch = line.match(/group-title="([^"]+)"/);
      const category = groupMatch ? groupMatch[1] : "General";

      currentChannel = { name, logo, category };
    } else if (line.startsWith("http")) {
      currentChannel.url = line;
      if (currentChannel.name) {
        channels.push(currentChannel);
      }
      currentChannel = {};
    }
  }
  return channels;
}
