import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Trophy, 
  User, 
  TrendingUp, 
  Calendar, 
  Hash,
  Coins,
  Database,
  CheckCircle,
  Info
} from 'lucide-react';

interface FormattedSummaryProps {
  content: string;
}

export default function FormattedSummary({ content }: FormattedSummaryProps) {
  // Parse delegate information from content
  const parseDelegates = () => {
    const delegates: any[] = [];
    
    // Pattern to match delegate entries with various formats
    const patterns = [
      // Format: "Delegate 0x... Voting Power: X Token"
      /Delegate\s+(0x[a-fA-F0-9]{40}).*?(?:Voting Power|balance):\s*([\d,]+\.?\d*)\s*(\w+)/gi,
      // Format: "0x... with X Token voting power"
      /(0x[a-fA-F0-9]{40}).*?with\s*([\d,]+\.?\d*)\s*(\w+).*?voting power/gi,
      // Format: numbered list with addresses
      /\d+\.\s*(0x[a-fA-F0-9]{40}).*?([\d,]+\.?\d*)\s*(\w+)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const address = match[1];
        const amount = match[2].replace(/,/g, '');
        const token = match[3];
        
        // Extract date if present
        const dateMatch = content.match(
          new RegExp(`${address}.*?(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})`, 'i')
        );
        
        if (!delegates.find(d => d.address === address)) {
          delegates.push({
            address,
            amount: parseFloat(amount),
            token,
            date: dateMatch ? dateMatch[1] : null,
            rank: delegates.length + 1
          });
        }
      }
    }
    
    return delegates.sort((a, b) => b.amount - a.amount).slice(0, 5);
  };
  
  const delegates = parseDelegates();
  const hasTableData = content.includes('table') || content.includes('schema');
  const hasQueryData = delegates.length > 0;
  
  // Extract key metrics
  const extractMetrics = () => {
    const metrics: any = {};
    
    // Look for total counts
    const totalMatch = content.match(/(\d+)\s+delegates?|found\s+(\d+)/i);
    if (totalMatch) {
      metrics.total = totalMatch[1] || totalMatch[2];
    }
    
    // Look for token type
    const tokenMatch = content.match(/\b(CTX|COMP|UNI|USDC|WETH|BETA)\b/);
    if (tokenMatch) {
      metrics.token = tokenMatch[1];
    }
    
    return metrics;
  };
  
  const metrics = extractMetrics();

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      {hasQueryData && (
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-800/30">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-gray-100">Query Results</h3>
            {metrics.token && (
              <span className="ml-auto text-sm bg-purple-800/50 px-2 py-1 rounded">
                {metrics.token} Token
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            Top delegates by voting power
          </p>
        </div>
      )}
      
      {/* Delegate Cards */}
      {delegates.length > 0 && (
        <div className="space-y-3">
          {delegates.map((delegate, index) => (
            <div 
              key={delegate.address}
              className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Rank Badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300 ring-2 ring-gray-400/30' :
                        index === 2 ? 'bg-orange-600/20 text-orange-400 ring-2 ring-orange-600/30' :
                        'bg-gray-700 text-gray-400'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Delegate</span>
                    </div>
                  </div>
                  
                  {/* Address */}
                  <div className="mb-3">
                    <code className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                      {delegate.address}
                    </code>
                  </div>
                  
                  {/* Voting Power */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-xl font-bold text-gray-100">
                          {delegate.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        <div className="text-xs text-gray-500">{delegate.token} voting power</div>
                      </div>
                    </div>
                    
                    {/* Date if available */}
                    {delegate.date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{delegate.date}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Rank Icon */}
                {index === 0 && <Trophy className="w-6 h-6 text-yellow-400" />}
                {index === 1 && <TrendingUp className="w-6 h-6 text-gray-300" />}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Regular Content */}
      {!hasQueryData && (
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom rendering for better formatting
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-gray-100 mb-4 mt-6 border-b border-gray-800 pb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-gray-200 mb-3 mt-4">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-200 leading-relaxed mb-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="space-y-2 ml-4">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mr-1">•</span>
                  <span className="text-gray-200">{children}</span>
                </li>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full divide-y divide-gray-800">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-900">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-gray-800">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-gray-900/50 transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-sm text-gray-200 whitespace-nowrap">
                  {children}
                </td>
              ),
              hr: () => (
                <hr className="my-4 border-gray-800" />
              ),
              code: ({ children, inline }) => 
                inline ? (
                  <code className="text-xs bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-900 p-3 rounded text-xs overflow-x-auto font-mono">
                    {children}
                  </code>
                ),
              strong: ({ children }) => (
                <strong className="text-gray-100 font-semibold">{children}</strong>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Additional Info */}
      {hasTableData && (
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 mt-0.5" />
          <div className="text-xs text-gray-400">
            <div className="font-medium mb-1">Data Source</div>
            <div className="text-gray-500">
              Results retrieved from blockchain governance data
            </div>
          </div>
        </div>
      )}
    </div>
  );
}