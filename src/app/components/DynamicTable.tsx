// src/components/DynamicTable.tsx
'use client' 
import React, { useMemo, useState, ReactElement } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_SortingState,
  type MRT_VisibilityState,
  type MRT_Cell,
  type MRT_PaginationState,
  type MRT_TableOptions,
} from 'material-react-table';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { format } from 'date-fns';

/**
 * Props for the DynamicTable component
 * @typedef {Object} DynamicTableProps
 * @property {Array<Object>} data - Array of objects to display in the table
 * @property {string} [title] - Optional title for the table
 * @property {Object} [initialState] - Optional initial state for the table
 */
interface DynamicTableProps {
  data: Record<string, any>[];
  title?: string;
  initialState?: {
    sorting?: MRT_SortingState;
    columnVisibility?: MRT_VisibilityState;
    columnFilters?: MRT_ColumnFiltersState;
    pagination?: {
      pageIndex?: number;
      pageSize?: number;
    };
  };
}

// Define valid filter variant types
type FilterVariantType = 
  | 'select' 
  | 'text' 
  | 'autocomplete' 
  | 'checkbox' 
  | 'date' 
  | 'date-range' 
  | 'datetime' 
  | 'datetime-range' 
  | 'multi-select' 
  | 'range' 
  | 'range-slider' 
  | 'time' 
  | 'time-range' 
  | undefined;

/**
 * A reusable dynamic table component that automatically generates columns from data
 * and provides sorting, filtering, column visibility, and resizing features.
 * 
 * @param {DynamicTableProps} props - Component props
 * @returns {ReactElement} The rendered table component
 */
export const DynamicTable: React.FC<DynamicTableProps> = ({ data, title, initialState }): ReactElement => {
  // Handle empty data case
  if (!data || data.length === 0) {
    return <Typography variant="body1">No data available</Typography>;
  }

  // State for table features
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>(
    initialState?.columnVisibility || {}
  );
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(
    initialState?.columnFilters || []
  );
  const [sorting, setSorting] = useState<MRT_SortingState>(
    initialState?.sorting || []
  );
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: initialState?.pagination?.pageIndex ?? 0,
    pageSize: initialState?.pagination?.pageSize ?? 100,
  });

  /**
   * Determines if a value is likely a Unix timestamp
   * 
   * @param {any} value - The value to check
   * @returns {boolean} True if the value appears to be a Unix timestamp
   */
  const isUnixTimestamp = (value: any): boolean => {
    return (
      typeof value === 'number' &&
      String(value).length === 10 &&
      value > 1000000000 &&
      value < 10000000000
    );
  };

  /**
   * Formats a Unix timestamp to a readable date string
   * 
   * @param {number} timestamp - The Unix timestamp to format
   * @returns {string} Formatted date string
   */
  const formatTimestamp = (timestamp: number): string => {
    try {
      return format(new Date(timestamp * 1000), 'dd-MMM-yyyy');
    } catch (e) {
      return String(timestamp);
    }
  };

  /**
   * Renders complex cell values (objects or arrays) as readable content
   * 
   * @param {any} value - The cell value to render
   * @returns {ReactElement} Rendered cell content
   */
  const renderCellValue = (value: any): ReactElement => {
    if (value === null || value === undefined) {
      return <Typography variant="body2">-</Typography>;
    }

    // Handle Unix timestamps
    if (isUnixTimestamp(value)) {
      return <Typography variant="body2">{formatTimestamp(value)}</Typography>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <Typography variant="body2">[]</Typography>;
      }
      
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {value.map((item, index) => (
            <Tooltip 
              key={index} 
              title={typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
              arrow
            >
              <Chip 
                label={typeof item === 'object' ? 
                  (Array.isArray(item) ? `Array(${item.length})` : 'Object') : 
                  String(item)} 
                size="small" 
                sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}
              />
            </Tooltip>
          ))}
        </Box>
      );
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      const stringified = JSON.stringify(value, null, 2);
      const preview = Object.keys(value).length > 0 
        ? `{${Object.keys(value).slice(0, 2).map(k => `${k}: ${typeof value[k] === 'object' ? '...' : value[k]}`).join(', ')}${Object.keys(value).length > 2 ? ', ...' : ''}}`
        : '{}';
        
      return (
        <Tooltip title={<pre style={{ whiteSpace: 'pre-wrap' }}>{stringified}</pre>} arrow>
          <Typography 
            variant="body2" 
            sx={{ 
              maxWidth: '200px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {preview}
          </Typography>
        </Tooltip>
      );
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return <Typography variant="body2">{value ? 'Yes' : 'No'}</Typography>;
    }

    // Handle all other primitive values
    return <Typography variant="body2">{String(value)}</Typography>;
  };

  /**
   * Determines the appropriate filter type for a column based on data type
   * 
   * @param {string} key - The column key
   * @param {any} sampleValue - A sample value from the column
   * @returns {FilterVariantType} The filter variant to use
   */
  const getFilterVariant = (key: string, sampleValue: any): FilterVariantType => {
    if (sampleValue === null || sampleValue === undefined) {
      // Look at other rows to determine type
      const nonNullValue = data.find(row => row[key] !== null && row[key] !== undefined);
      if (nonNullValue) {
        return getFilterVariant(key, nonNullValue[key]);
      }
      return 'text'; // Default to text if all values are null/undefined
    }

    if (typeof sampleValue === 'number') {
      return isUnixTimestamp(sampleValue) ? 'date' : 'range';
    }

    if (typeof sampleValue === 'boolean') {
      return 'checkbox';
    }

    if (typeof sampleValue === 'object') {
      return 'text'; // Use text filtering for objects/arrays
    }

    return 'text';
  };

  /**
   * Creates a filter function for complex object values
   * 
   * @param {string} filterValue - The value to filter by
   * @returns {function} A filter function
   */
  const createObjectFilterFn = (filterValue: string) => {
    return (value: any): boolean => {
      if (value === null || value === undefined) return false;
      
      const stringified = JSON.stringify(value).toLowerCase();
      return stringified.includes(filterValue.toLowerCase());
    };
  };

  // Dynamically generate columns from the data
  const columns = useMemo<MRT_ColumnDef<Record<string, any>>[]>(() => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => {
      // Find first non-null value for this column to determine type
      const sampleValue = data.find(row => row[key] !== null && row[key] !== undefined)?.[key] ?? firstRow[key];
      const filterVariant = getFilterVariant(key, sampleValue);
      
      // Format header from camelCase/snake_case to Title Case
      const header = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      
      return {
        accessorKey: key,
        header,
        Cell: ({ cell }: { cell: MRT_Cell<Record<string, any>, unknown> }) => renderCellValue(cell.getValue()),
        filterVariant,
        enableColumnFilter: true,
        enableSorting: true,
        enableResizing: true,
        // Custom filter function for object/array values
        filterFn: typeof sampleValue === 'object' ? 
          (row, id, filterValue) => createObjectFilterFn(filterValue)(row.getValue(id)) :
          undefined,
        // Custom sort function for object/array values
        sortingFn: (sampleValue !== null && typeof sampleValue === 'object' && !Array.isArray(sampleValue)) 
          ? (rowA, rowB, columnId) => {
              const valueA = rowA.getValue(columnId) ?? {};
              const valueB = rowB.getValue(columnId) ?? {};
              return JSON.stringify(valueA).localeCompare(JSON.stringify(valueB));
            }
          : 'alphanumeric', // Use built-in sorter for primitives and null
        // Set minimum width for columns
        minSize: 150,
      };
    });
  }, [data]);

  // Create table options with proper typing
  const tableOptions: MRT_TableOptions<Record<string, any>> = {
    columns,
    data,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableColumnFilters: true,
    enableFilters: true,
    enableSorting: true,
    enableColumnActions: true,
    enableHiding: true,
    enableDensityToggle: true,
    enableFullScreenToggle: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    muiTableContainerProps: { 
      sx: { 
        height: '100%',
        maxHeight: 'none',
        overflow: 'auto'
      } 
    },
    state: {
      columnVisibility,
      columnFilters,
      sorting,
      pagination,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    renderDetailPanel: ({ row }) => (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Full Data:</Typography>
        <Box 
          component="pre" 
          sx={{ 
            backgroundColor: '#f5f5f5', 
            p: 2, 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px',
            fontSize: '0.875rem',
          }}
        >
          {JSON.stringify(row.original, null, 2)}
        </Box>
      </Box>
    ),
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 'bold',
      },
    },
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
        size: 100,
      },
    },
    positionActionsColumn: 'last',
    enableRowActions: false,
    localization: {
      noRecordsToDisplay: 'No data available',
    },
    initialState: {
      density: 'compact',
    },
  };

  // Add sorting, filters, and visibility from initialState if provided
  if (initialState?.sorting) {
    tableOptions.initialState = {
      ...tableOptions.initialState,
      sorting: initialState.sorting,
    };
  }

  if (initialState?.columnFilters) {
    tableOptions.initialState = {
      ...tableOptions.initialState,
      columnFilters: initialState.columnFilters,
    };
  }

  if (initialState?.columnVisibility) {
    tableOptions.initialState = {
      ...tableOptions.initialState,
      columnVisibility: initialState.columnVisibility,
    };
  }

  // Handle pagination separately to avoid type errors
  if (initialState?.pagination) {
    tableOptions.initialState = {
      ...tableOptions.initialState,
      pagination: {
        pageIndex: initialState.pagination.pageIndex ?? 0,
        pageSize: initialState.pagination.pageSize ?? 10,
      },
    };
  }

  // Create the table
  const table = useMaterialReactTable(tableOptions);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <MaterialReactTable 
        table={table} 
        sx={{
          flex: 1,
          minHeight: 0,
        }}
      />
    </Box>
  );
};

export default DynamicTable;
