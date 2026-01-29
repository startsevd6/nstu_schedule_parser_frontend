export interface TableRow {
    [key: string]: string;
}

export interface ColumnFilter {
    [column: string]: string;
}

export interface FilteredTableProps {
    data: TableRow[];
}