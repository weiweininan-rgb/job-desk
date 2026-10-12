import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: '已投递', label: '已投递' },
  { value: '简历筛选', label: '简历筛选' },
  { value: '笔试', label: '笔试' },
  { value: '一面', label: '一面' },
  { value: '二面', label: '二面' },
  { value: 'HR面', label: 'HR面' },
  { value: 'Offer', label: 'Offer' },
  { value: '已拒绝', label: '已拒绝' },
];

export const SearchAndFilter = ({ 
  onSearch, 
  onFilter, 
  filters, 
  renderFilterButton 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    onSearch('');
    onFilter({ status: 'all', hasInterview: 'all' });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.hasInterview !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索公司、职位..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setSearchQuery('');
              onSearch('');
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {renderFilterButton && renderFilterButton(hasActiveFilters)}
    </div>
  );
};

// 独立的筛选按钮组件，可与其他按钮组合使用
export const FilterButton = ({ filters, onFilterChange, hasActiveFilters }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleStatusChange = (value) => {
    const newFilters = { ...localFilters, status: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleInterviewChange = (value) => {
    const newFilters = { ...localFilters, hasInterview: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const resetFilters = { status: 'all', hasInterview: 'all' };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = (filters.status !== 'all' ? 1 : 0) + (filters.hasInterview !== 'all' ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "secondary" : "outline"} 
          size="sm"
          className="h-9 gap-1.5 px-3"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">筛选</span>
          {hasActiveFilters && (
            <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs bg-teal-600">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">申请状态</label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">面试状态</label>
            <Select value={filters.hasInterview} onValueChange={handleInterviewChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="has">有面试安排</SelectItem>
                <SelectItem value="none">暂无面试</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
              清除所有筛选
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
