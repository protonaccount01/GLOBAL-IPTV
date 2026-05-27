export async function onRequest(context) {
  // CORS হ্যান্ডেল করার জন্য হেডারস
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // যখন ফ্রন্টএন্ড থেকে প্রথম রিকোয়েস্ট চেক করা হয়
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // দুনিয়ার সব সোর্সের মেইন মেইন লিংক এখানে অ্যারে-তে অ্যাড করতে পারবেন
    const sources = [
      "https://iptv-org.github.io/iptv/index.m3u", // গ্লোবাল ফ্রি সোর্স
      "https://iptv-org.github.io/iptv/countries/bd.m3u" // বাংলাদেশ সোর্স
    ];

    let allChannels = [];

    // সব সোর্স থেকে ডেটা ফেচ করা
    for (const source of sources) {
      const response = await fetch(source);
      const m3uText = await response.text();
      const parsedChannels = parseM3U(m3uText);
      allChannels = allChannels.concat(parsedChannels);
    }

    // ডুপ্লিকেট চ্যানেল রিমুভ করার লজিক
    const uniqueChannels = [];
    const seenUrls = new Set();
    for (const channel of allChannels) {
      if (!seenUrls.has(channel.url)) {
        seenUrls.add(channel.url);
        uniqueChannels.push(channel);
      }
    }

    return new Response(JSON.stringify({ channels: uniqueChannels }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// M3U ফাইল থেকে চ্যানেল নাম, লোগো এবং .m3u8 লিংক আলাদা করার ফাংশন
function parseM3U(m3uText) {
  const lines = m3uText.split("\n");
  const channels = [];
  let currentChannel = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF:")) {
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : "Unknown Channel";

      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : "https://via.placeholder.com/150";

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
