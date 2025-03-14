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

import {JSON5,} from 'pk-ts-common-lib';

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
      const formattedDate = formatTimestamp(value);
      return (
        <Tooltip title={formattedDate} arrow>
          <Typography variant="body2" noWrap>{formattedDate}</Typography>
        </Tooltip>
      );
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
              title={typeof item === 'object' ? JSON5.stringify(item, null, 2) : String(item)}
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
      const stringified = JSON5.stringify(value, null, 2);
      const preview = Object.keys(value).length > 0 
        ? `{${Object.keys(value).slice(0, 2).map(k => `${k}: ${typeof value[k] === 'object' ? '...' : value[k]}`).join(', ')}${Object.keys(value).length > 2 ? ', ...' : ''}}`
        : '{}';
        
      return (
        <Tooltip title={<pre style={{ whiteSpace: 'pre-wrap' }}>{stringified}</pre>} arrow>
          <Typography 
            variant="body2" 
            sx={{ 
              maxWidth: '100%', 
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

    // Handle all other primitive values (strings, numbers)
    // Add tooltip for all text content to show full text when truncated
    const stringValue = String(value);
    return (
      <Tooltip title={stringValue} arrow>
        <Typography 
          variant="body2" 
          sx={{ 
            maxWidth: '100%',
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {stringValue}
        </Typography>
      </Tooltip>
    );
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
      
      const stringified = JSON5.stringify(value).toLowerCase();
      return stringified.includes(filterValue.toLowerCase());
    };
  };

  // Dynamically generate columns from the data
  const columns = useMemo<MRT_ColumnDef<Record<string, any>>[]>(() => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Calculate a reasonable default size for each column
    const defaultColumnSize = Math.max(120, Math.floor(1000 / keys.length));
    
    return keys.map((key) => {
      // Find first non-null value for this column to determine type
      const sampleValue = data.find(row => row[key] !== null && row[key] !== undefined)?.[key] ?? firstRow[key];
      const filterVariant = getFilterVariant(key, sampleValue);
      
      // Format header from camelCase/snake_case to Title Case
      const header = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      
      // Estimate a reasonable column width based on content and header
      const headerLength = header.length * 10; // Approximate pixel width
      
      // Sample some values to estimate content width
      const contentSamples = data.slice(0, 10).map(row => row[key]);
      const contentMaxLength = Math.max(
        ...contentSamples.map(val => 
          val === null || val === undefined 
            ? 0 
            : (typeof val === 'object' 
                ? JSON5.stringify(val).length * 5 
                : String(val).length * 8)
        )
      );
      
      // Use the larger of header or content, but cap it
      const estimatedSize = Math.min(
        Math.max(headerLength, contentMaxLength, 80),
        300 // Cap at 300px initially
      );
      
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
              return JSON5.stringify(valueA).localeCompare(JSON5.stringify(valueB));
            }
          : 'alphanumeric', // Use built-in sorter for primitives and null
        // Updated sizing properties with content-based estimation
        minSize: 80,
        maxSize: 500,
        size: estimatedSize,
        
        // Cell props for better text handling
        muiTableHeadCellProps: {
          sx: {
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '8px',
          },
        },
        muiTableBodyCellProps: {
          sx: {
            padding: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
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
    
    // Use 'semantic' layout mode for better content-based sizing
    layoutMode: 'semantic',
    
    muiTableContainerProps: { 
      sx: { 
        height: '100%',
        maxHeight: 'none',
        overflow: 'auto',
        width: '100%', // Ensure full width
      } 
    },
    muiTablePaperProps: { 
      sx: { 
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '100%', // Ensure full width
      }
    },
    muiTableProps: {
      sx: {
        width: '100%',
        tableLayout: 'auto', // Change to 'auto' to better respect content width
      },
      className: "dynamic-table-with-borders"
    },
    
    // Update default column settings
    defaultColumn: {
      minSize: 80, // Smaller minimum to allow more flexibility
      maxSize: 1000,
      size: 150,
      
      // Add cell props to all columns for better text handling
      muiTableBodyCellProps: {
        sx: {
          padding: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
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
          {JSON5.stringify(row.original, null, 2)}
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
      <MaterialReactTable table={table} />
      
      {/* Add custom styles for the table borders */}
      <style jsx global>{`
        /* More specific selector to ensure styles are applied */
        .dynamic-table-with-borders .MuiTable-root .MuiTableCell-root {
          border-right: 1px solid rgba(244, 67, 54, 0.2) !important; /* Light red border with !important */
        }
        
        .dynamic-table-with-borders .MuiTable-root .MuiTableCell-root:last-child {
          border-right: none !important;
        }
        
        .dynamic-table-with-borders .MuiTable-root .MuiTableHead-root .MuiTableCell-root {
          border-right: 1px solid rgba(244, 67, 54, 0.3) !important; /* Slightly darker red for headers */
        }
        
        /* Add vertical borders that span the full height */
        .dynamic-table-with-borders .MuiTable-root {
          border-collapse: separate;
          border-spacing: 0;
        }
        
        /* Ensure content is properly aligned and doesn't have excessive whitespace */
        .dynamic-table-with-borders .MuiTableCell-root {
          padding-left: 8px !important;
          padding-right: 8px !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </Box>
  );
};

export default DynamicTable;
