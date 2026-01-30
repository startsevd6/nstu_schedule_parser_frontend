import React, {useState, useEffect, useMemo, useCallback} from 'react';
import type {TableRow, ColumnFilter} from './types/data';
import './App.css';

function App() {
    const [data, setData] = useState<TableRow[]>([]);
    const [filteredData, setFilteredData] = useState<TableRow[]>([]);
    const [filters, setFilters] = useState<ColumnFilter>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState<boolean>(true);

    const parseCSVLine = useCallback((line: string): string[] => {
        const result: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        result.push(currentValue.trim());
        return result;
    }, []);

    // Функция парсинга CSV
    const parseCSV = useCallback((csvText: string): TableRow[] => {
        const lines = csvText.split('\n');
        const result: TableRow[] = [];

        if (lines.length === 0) return result;

        const headers = lines[0].split(',').map(header => header.trim());

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            if (!currentLine) continue;

            const values = parseCSVLine(currentLine);
            const row: TableRow = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            result.push(row);
        }

        return result;
    }, [parseCSVLine]);

    // Загрузка CSV данных
    useEffect(() => {
        const loadCSVData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/data.csv');

                if (!response.ok) {
                    setError(`Ошибка загрузки: ${response.status}`);
                    setIsLoading(false);
                    return;
                }

                const csvText = await response.text();
                const parsedData = parseCSV(csvText);

                if (parsedData.length > 0) {
                    setHeaders(Object.keys(parsedData[0]));
                    setData(parsedData);
                    setFilteredData(parsedData);

                    // Инициализация фильтров для всех столбцов
                    const initialFilters: ColumnFilter = {};
                    Object.keys(parsedData[0]).forEach(header => {
                        initialFilters[header] = '';
                    });
                    setFilters(initialFilters);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
                console.error('Ошибка загрузки CSV:', err);
            } finally {
                setIsLoading(false);
            }
        };

        void loadCSVData();
    }, [parseCSV]);

    // Применение фильтров
    const applyFilters = () => {
        if (Object.values(filters).every(val => !val.trim())) {
            setFilteredData(data);
            return;
        }

        const filtered = data.filter(row => {
            return Object.entries(filters).every(([column, filterValue]) => {
                if (!filterValue.trim()) return true;

                const cellValue = row[column]?.toLowerCase() || '';
                const searchValue = filterValue.toLowerCase().trim();

                return cellValue.includes(searchValue);
            });
        });

        setFilteredData(filtered);
    };

    // Сброс всех фильтров
    const resetAllFilters = () => {
        const resetFilters: ColumnFilter = {};
        headers.forEach(header => {
            resetFilters[header] = '';
        });
        setFilters(resetFilters);
        setFilteredData(data);
    };

    // Сброс одного фильтра
    const resetFilter = (column: string) => {
        setFilters(prev => ({
            ...prev,
            [column]: ''
        }));
    };

    // Обработка изменения фильтра
    const handleFilterChange = (column: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    // Применение фильтров по нажатию Enter
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    // Показать/скрыть панель фильтров
    const toggleFiltersPanel = () => {
        setShowFilters(!showFilters);
    };

    // Получить количество активных фильтров
    const activeFiltersCount = useMemo(() => {
        return Object.values(filters).filter(val => val.trim() !== '').length;
    }, [filters]);

    if (isLoading) {
        return (
            <div className="app">
                <div className="loading">Загрузка данных...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <div className="error">Ошибка: {error}</div>
                <p>Пожалуйста, убедитесь что файл data.csv находится в папке public</p>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <h1>CSV Таблица с фильтрами по всем столбцам</h1>
                <p className="subtitle">
                    Фильтруйте данные по любому столбцу. Фильтры применяются вместе (логическое И)
                </p>
            </header>

            <main className="main-content">
                {/* Панель управления фильтрами */}
                <div className="filters-controls">
                    <div className="filters-header">
                        <div className="filters-title">
                            <h2>Фильтры столбцов</h2>
                            <span className={`active-filters-badge ${activeFiltersCount > 0 ? 'active' : ''}`}>
                Активных фильтров: {activeFiltersCount}
              </span>
                        </div>
                        <div className="filters-actions">
                            <button
                                onClick={toggleFiltersPanel}
                                className="btn btn-toggle"
                            >
                                {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                            </button>
                            <button
                                onClick={applyFilters}
                                className="btn btn-primary"
                            >
                                Применить фильтры
                            </button>
                            <button
                                onClick={resetAllFilters}
                                className="btn btn-secondary"
                            >
                                Сбросить все
                            </button>
                        </div>
                    </div>

                    {/* Панель фильтров */}
                    {showFilters && (
                        <div className="filters-panel">
                            <div className="filters-grid">
                                {headers.map((header, index) => (
                                    <div key={header} className="filter-item">
                                        <div className="filter-header">
                                            <label htmlFor={`filter-${index}`}>
                                                <span className="filter-index">{index + 1}.</span>
                                                {header}
                                            </label>
                                            {filters[header] && (
                                                <button
                                                    onClick={() => resetFilter(header)}
                                                    className="btn-clear"
                                                    title="Очистить фильтр"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            id={`filter-${index}`}
                                            type="text"
                                            value={filters[header] || ''}
                                            onChange={(e) => handleFilterChange(header, e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={`Фильтр по "${header}"...`}
                                            className="filter-input"
                                        />
                                        {filters[header] && (
                                            <div className="filter-hint">
                                                Поиск: "{filters[header]}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Статистика */}
                    <div className="stats-panel">
                        <div className="stats">
                            <div className="stat-item">
                                <span className="stat-label">Всего строк:</span>
                                <span className="stat-value">{data.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Отфильтровано:</span>
                                <span className="stat-value">{filteredData.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Соответствует:</span>
                                <span className="stat-value">
                  {data.length > 0
                      ? `${((filteredData.length / data.length) * 100).toFixed(1)}%`
                      : '0%'}
                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Таблица с данными */}
                <div className="table-container">
                    {filteredData.length > 0 ? (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                <tr>
                                    {headers.map((header, index) => (
                                        <th key={header}>
                                            <div className="column-header">
                                                <span className="column-index">{index + 1}</span>
                                                <span className="column-title">{header}</span>
                                                {filters[header] && (
                                                    <span className="filter-indicator"
                                                          title={`Фильтр: ${filters[header]}`}>
                              🔍
                            </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.slice(0, 100).map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {headers.map((header, cellIndex) => (
                                            <td key={`${rowIndex}-${cellIndex}`}>
                                                <div className="cell-content">
                                                    {row[header] || <span className="empty-cell">—</span>}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                            {/* Предупреждение о большом количестве строк */}
                            {filteredData.length > 100 && (
                                <div className="table-footer">
                                    Показано 100 из {filteredData.length} строк.
                                    Используйте фильтры для уточнения результатов.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data-message">
                            <div className="no-data-icon">📊</div>
                            <h3>Нет данных для отображения</h3>
                            <p>
                                {activeFiltersCount > 0
                                    ? 'Ни одна строка не соответствует заданным фильтрам. Попробуйте изменить условия фильтрации.'
                                    : 'Данные не загружены или таблица пуста.'}
                            </p>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={resetAllFilters}
                                    className="btn btn-primary"
                                >
                                    Сбросить все фильтры
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Быстрые действия */}
                <div className="quick-actions">
                    <div className="actions-title">Быстрые действия:</div>
                    <div className="actions-buttons">
                        <button
                            onClick={() => {
                                // Пример: фильтр для пустых значений в первом столбце
                                const firstColumn = headers[0];
                                if (firstColumn) {
                                    handleFilterChange(firstColumn, '');
                                    applyFilters();
                                }
                            }}
                            className="btn btn-outline"
                        >
                            Показать все строки
                        </button>
                        <button
                            onClick={() => {
                                // Пример: найти строки с числовыми значениями
                                headers.forEach(header => {
                                    handleFilterChange(header, '');
                                });
                                applyFilters();
                            }}
                            className="btn btn-outline"
                        >
                            Очистить и показать все
                        </button>
                    </div>
                </div>
            </main>

            <footer className="footer">
                <p>
                    Загружено строк: {data.length} |
                    Столбцов: {headers.length} |
                    Активных фильтров: {activeFiltersCount}
                </p>
                <p className="footer-hint">
                    💡 Совет: Используйте Enter для быстрого применения фильтров
                </p>
            </footer>
        </div>
    );
}

export default App;