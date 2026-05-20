export async function getRedditAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  // Fallback to mock mode if credentials are missing or left as the default placeholder
  if (!clientId || !clientSecret || clientId === "your_client_id_here") {
    console.warn("Using MOCK Reddit API. Real credentials not found.");
    return "mock_access_token";
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "client_credentials"
  });

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "OperationEmpathy/1.0.0 (Internal Review Tool)"
    },
    body: params
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Reddit: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Helper to generate fake Reddit posts for the mock fallback
function generateMockRedditData(query) {
  const isKeyword = query !== "test_subreddit";
  const subreddit = isKeyword ? "SkincareAddiction" : query;
  
  return [
    {
      id: `mock1_${Date.now()}`,
      title: `Has anyone tried fixing ${isKeyword ? query : "this issue"} naturally?`,
      selftext: `I've been dealing with ${isKeyword ? query : "this"} for weeks now. Nothing seems to work and I'm hesitant to buy expensive products. Any advice?`,
      subreddit: subreddit,
      created_utc: Date.now() / 1000 - 3600
    },
    {
      id: `mock2_${Date.now()}`,
      title: `Looking for recommendations for ${isKeyword ? query : "dry skin"}`,
      selftext: `My current routine isn't helping with the ${isKeyword ? query : "dryness"}. I need something soothing that won't break the bank.`,
      subreddit: subreddit,
      created_utc: Date.now() / 1000 - 7200
    },
    {
      id: `mock3_${Date.now()}`,
      title: `Is it normal to experience ${isKeyword ? query : "redness"} after using a new serum?`,
      selftext: `Just started a new routine and wondering if this is a normal reaction or if I should stop immediately.`,
      subreddit: "DermatologyQuestions",
      created_utc: Date.now() / 1000 - 14400
    }
  ];
}

export async function fetchSubredditPosts(subreddit, limit = 25) {
  const token = await getRedditAccessToken();

  if (token === "mock_access_token") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return generateMockRedditData(subreddit).slice(0, limit);
  }

  // Using the read-only /new endpoint
  const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "OperationEmpathy/1.0.0 (Internal Review Tool)"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch from Reddit: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.data.children.map((child) => child.data);
}

export async function searchRedditPosts(query, limit = 25) {
  const token = await getRedditAccessToken();

  if (token === "mock_access_token") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return generateMockRedditData(query).slice(0, limit);
  }

  const response = await fetch(`https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=${limit}&type=link&sort=new`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "OperationEmpathy/1.0.0 (Internal Review Tool)"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search Reddit: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.data.children.map((child) => child.data);
}
