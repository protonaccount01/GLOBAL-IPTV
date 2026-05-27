export default {
  async fetch(request, env, ctx) {
    // CORS হ্যান্ডেল করার জন্য হেডারস
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // যখন ফ্রন্টএন্ড থেকে চ্যানেলের লিস্ট চাওয়া হবে (/api/channels)
    if (url.pathname === "/api/channels") {
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

        // ডুপ্লিকেট চ্যানেল রিমুভ করার লজিক (নাম এবং লিংক ট্র্যাক করে)
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

    return new Response("Not Found", { status: 404 });
  },
};

// M3U ফাইল থেকে চ্যানেল নাম, লোগো এবং .m3u8 লিংক আলাদা করার ফাংশন
function parseM3U(m3uText) {
  const lines = m3uText.split("\n");
  const channels = [];
  let currentChannel = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF:")) {
      // চ্যানেলের নাম বের করা
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : "Unknown Channel";

      // লোগো বা আইকন বের করা
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : "https://via.placeholder.com/150";

      // গ্রুপ বা ক্যাটাগরি বের করা
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
