// Simple web search using DuckDuckGo's HTML interface
async function searchDuckDuckGo(query: string): Promise<any[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Simple regex to extract results
    const results = [];
    const resultPattern = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)</g;
    let match;
    let count = 0;
    
    while ((match = resultPattern.exec(html)) !== null && count < 5) {
      results.push({
        url: match[1],
        title: match[2].trim(),
        snippet: match[3].trim().replace(/\s+/g, ' ')
      });
      count++;
    }
    
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

// Tavily search (if API key is available)
async function searchTavily(query: string): Promise<any[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: 5,
        include_answer: true,
        include_raw_content: false
      })
    });
    
    const data = await response.json();
    
    if (data.results) {
      return data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Tavily search error:', error);
    return [];
  }
}

// Function to fetch and parse web pages (simple implementation without cheerio)
export async function fetchWebPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Simple HTML to text conversion (remove tags)
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Truncate if too long (max 10000 chars)
    if (text.length > 10000) {
      return text.substring(0, 10000) + '...[truncated]';
    }
    
    return text;
  } catch (error) {
    console.error('Error fetching webpage:', error);
    throw new Error(`Failed to fetch ${url}: ${error}`);
  }
}

// Main search function that tries multiple providers
export async function searchWeb(query: string): Promise<any> {
  try {
    console.log('🔍 Searching for:', query);
    
    // Try Tavily first if API key is available
    if (process.env.TAVILY_API_KEY) {
      console.log('Using Tavily search...');
      const tavilyResults = await searchTavily(query);
      if (tavilyResults.length > 0) {
        return tavilyResults;
      }
    }
    
    // Fallback to DuckDuckGo HTML scraping
    console.log('Using DuckDuckGo search...');
    const ddgResults = await searchDuckDuckGo(query);
    
    if (ddgResults.length > 0) {
      return ddgResults;
    }
    
    // If all else fails, suggest using a search engine
    return [{
      title: 'Search suggestion',
      snippet: `Please search for "${query}" using a web browser for the most current information.`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    }];
    
  } catch (error) {
    console.error('Error searching web:', error);
    throw error;
  }
}