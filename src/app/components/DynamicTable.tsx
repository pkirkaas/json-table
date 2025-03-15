// src/components/DynamicTable.tsx
'use client';
import React, { useMemo, useState, useEffect, useLayoutEffect, ReactElement } from 'react';
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

import { JSON5, } from 'pk-ts-common-lib';

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

  // Track if component has mounted (client-side)
  const [hasMounted, setHasMounted] = useState(false);

  // Set hasMounted to true after initial render
  useEffect(() => {
    setHasMounted(true);
  }, []);

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
            // Change from nowrap to normal to allow wrapping
            whiteSpace: 'normal',
            // Limit to 3 lines of text
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
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

    // Use fixed values for initial render to avoid hydration mismatches
    const defaultColumnWidth = 150;
    const minColumnWidth = 80;
    const maxColumnWidth = 300;

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

      // Use fixed size for initial render to ensure hydration consistency
      const estimatedSize = defaultColumnWidth;

      return {
        accessorKey: key,
        header,
        Cell: ({ cell }: { cell: MRT_Cell<Record<string, any>, unknown>; }) => renderCellValue(cell.getValue()),
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
        // Updated sizing properties with stricter limits
        minSize: minColumnWidth,
        maxSize: maxColumnWidth * 2, // Allow resizing to be larger, but not excessive
        size: estimatedSize,

        // Update cell props to handle wrapping
        muiTableHeadCellProps: {
          sx: {
            fontWeight: 'bold',
            padding: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            borderRight: '1px solid rgba(244, 67, 54, 0.3)', // Add direct border styling
          },
        },
        muiTableBodyCellProps: {
          sx: {
            padding: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal', // Allow wrapping
            borderRight: '1px solid rgba(244, 67, 54, 0.2)', // Add direct border styling
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
    columnResizeMode: 'onEnd', // Change to onEnd for better performance
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

    // Change layout mode to 'grid' for better width control
    layoutMode: 'grid',

    muiTableContainerProps: {
      sx: {
        height: '100%',
        maxHeight: 'none',
        overflow: 'auto',
        width: '100%',
        maxWidth: '100%', // Ensure table doesn't exceed container
      }
    },
    muiTablePaperProps: {
      sx: {
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%', // Ensure paper doesn't exceed container
        overflow: 'hidden', // Prevent overflow
      }
    },
    muiTableProps: {
      sx: {
        width: '100%',
        maxWidth: '100%', // Ensure table doesn't exceed container
        tableLayout: 'fixed', // Use fixed layout for better column width control
        borderCollapse: 'separate', // Required for border styling
        borderSpacing: 0,
      },
      className: "dynamic-table-with-borders"
    },

    // Update default column settings
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,

      // Add cell props to all columns for better text handling and borders
      muiTableBodyCellProps: {
        sx: {
          padding: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal', // Allow wrapping
          borderRight: '1px solid rgba(244, 67, 54, 0.2)', // Add direct border styling
        },
      },
      muiTableHeadCellProps: {
        sx: {
          fontWeight: 'bold',
          borderRight: '1px solid rgba(244, 67, 54, 0.3)', // Add direct border styling
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
      'mrt-row-expand': {
        header: '',
        size: 30, // Fixed small width
        minSize: 30, // Prevent resizing smaller
        maxSize: 30, // Prevent resizing larger
        muiTableHeadCellProps: {
          align: 'center',
          sx: {
            padding: '4px',
          },
        },
        muiTableBodyCellProps: {
          align: 'center',
          sx: {
            padding: '4px',
          },
        },
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

  // After hydration, recalculate column widths based on available space
  useLayoutEffect(() => {
    if (hasMounted && table) {
      // Only run this on the client after hydration
      const availableWidth = window.innerWidth - 100;
      const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
      const maxColumnWidth = Math.min(300, Math.floor(availableWidth / keys.length));

      // Update column sizes
      table.setColumnSizing((prev) => {
        const newSizing = { ...prev };
        columns.forEach((column) => {
          if (column.accessorKey) {
            // Calculate a more appropriate size based on content
            const headerLength = String(column.header).length * 10;
            const contentSamples = data.slice(0, 10).map(row => row[column.accessorKey as string]);
            const contentMaxLength = Math.max(
              ...contentSamples.map(val =>
                val === null || val === undefined
                  ? 0
                  : (typeof val === 'object'
                    ? JSON5.stringify(val).length * 5
                    : String(val).length * 8)
              )
            );

            const calculatedSize = Math.min(
              Math.max(
                Math.min(headerLength, 200),
                Math.min(contentMaxLength, 250),
                80 // minColumnWidth
              ),
              maxColumnWidth
            );

            newSizing[column.accessorKey] = calculatedSize;
          }
        });
        return newSizing;
      });
    }
  }, [hasMounted, columns, table, data]);

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
        /* Apply borders directly to cells */
        .MuiTableCell-root {
          border-right: 1px solid rgba(244, 67, 54, 0.2) !important;
        }
        
        .MuiTableHead-root .MuiTableCell-root {
          border-right: 1px solid rgba(244, 67, 54, 0.3) !important;
        }
        
        .MuiTableCell-root:last-child {
          border-right: none !important;
        }
        
        /* Ensure proper table layout */
        .MuiTable-root {
          table-layout: fixed !important;
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        
        /* Adjust cell padding and text handling */
        .MuiTableCell-root {
          padding: 8px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        
        /* Allow text wrapping in body cells */
        .MuiTableBody-root .MuiTableCell-root {
          white-space: normal !important;
          word-wrap: break-word !important;
        }
        
        /* Keep header cells with nowrap */
        .MuiTableHead-root .MuiTableCell-root {
          white-space: nowrap !important;
        }
      `}</style>
    </Box>
  );
};

export default DynamicTable;
