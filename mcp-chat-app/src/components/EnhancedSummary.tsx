import React from 'react';
import { Trophy, TrendingUp, Users, Clock, Database, ArrowRight } from 'lucide-react';

interface DelegateInfo {
  rank: number;
  address: string;
  votingPower: number;
  formattedPower: string;
  lastUpdated?: string;
  percentOfTotal?: number;
}

interface SummaryProps {
  content: string;
  queryType?: 'delegates' | 'balances' | 'general';
}

export default function EnhancedSummary({ content, queryType }: SummaryProps) {
  // Extract delegate data from content
  const extractDelegates = (): DelegateInfo[] => {
    const delegates: DelegateInfo[] = [];
    
    // Pattern to match delegate addresses with voting power
    const pattern = /(0x[a-fA-F0-9]{40})[^\n]*?(?:with|:)\s*([\d,]+(?:\.\d+)?)\s*(?:CTX|tokens)?/gi;
    const matches = content.matchAll(pattern);
    
    let rank = 1;
    for (const match of matches) {
      const address = match[1];
      const powerStr = match[2].replace(/,/g, '');
      const votingPower = parseFloat(powerStr);
      
      if (!isNaN(votingPower) && votingPower > 0) {
        delegates.push({
          rank: rank++,
          address,
          votingPower,
          formattedPower: votingPower.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })
        });
      }
    }
    
    // Sort by voting power descending
    delegates.sort((a, b) => b.votingPower - a.votingPower);
    
    // Calculate percentages
    const total = delegates.reduce((sum, d) => sum + d.votingPower, 0);
    delegates.forEach(d => {
      d.percentOfTotal = (d.votingPower / total) * 100;
    });
    
    return delegates.slice(0, 3);
  };

  const delegates = extractDelegates();
  const hasValidDelegates = delegates.length > 0 && delegates[0].votingPower > 100;

  if (queryType === 'delegates' && hasValidDelegates) {
    const totalPower = delegates.reduce((sum, d) => sum + d.votingPower, 0);
    
    return (
      <div className="space-y-4">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-800/30">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-100">Top 3 Delegates by Voting Power</h3>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{delegates.length} delegates</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{totalPower.toLocaleString()} CTX total</span>
            </div>
          </div>
        </div>

        {/* Delegate Cards */}
        <div className="space-y-3">
          {delegates.map((delegate) => (
            <div 
              key={delegate.address}
              className={`relative rounded-lg border p-4 transition-all hover:shadow-lg ${
                delegate.rank === 1 
                  ? 'bg-gradient-to-r from-yellow-900/10 to-orange-900/10 border-yellow-700/50' 
                  : delegate.rank === 2
                  ? 'bg-gradient-to-r from-gray-900/30 to-gray-800/30 border-gray-700/50'
                  : 'bg-gradient-to-r from-amber-900/10 to-orange-900/10 border-amber-700/50'
              }`}
            >
              {/* Rank Badge */}
              <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                delegate.rank === 1 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white' 
                  : delegate.rank === 2
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                  : 'bg-gradient-to-br from-amber-600 to-orange-600 text-white'
              }`}>
                {delegate.rank}
              </div>

              {/* Content */}
              <div className="ml-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <code className="text-xs text-gray-400 font-mono break-all">
                      {delegate.address}
                    </code>
                  </div>
                  {delegate.percentOfTotal && (
                    <span className="text-xs text-gray-500 ml-2">
                      {delegate.percentOfTotal.toFixed(1)}%
                    </span>
                  )}
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-100">
                    {delegate.formattedPower}
                  </span>
                  <span className="text-sm text-gray-400">CTX</span>
                </div>

                {/* Progress Bar */}
                {delegate.percentOfTotal && (
                  <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        delegate.rank === 1 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                          : delegate.rank === 2
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600'
                      }`}
                      style={{ width: `${Math.min(delegate.percentOfTotal * 2, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Concentration</div>
            <div className="text-sm font-semibold text-gray-200">
              {((delegates[0]?.votingPower / totalPower) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Top delegate</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Top 2 Control</div>
            <div className="text-sm font-semibold text-gray-200">
              {(((delegates[0]?.votingPower + (delegates[1]?.votingPower || 0)) / totalPower) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Combined</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Total Power</div>
            <div className="text-sm font-semibold text-gray-200">
              {(totalPower / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-gray-500">CTX tokens</div>
          </div>
        </div>
      </div>
    );
  }

  // Default rendering for non-delegate queries
  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
    </div>
  );
}