import React, { useState, useEffect } from 'react';
import type {TableRow} from './types/data';
import './App.css';

function App() {
    const [data, setData] = useState<TableRow[]>([]);
    const [filteredData, setFilteredData] = useState<TableRow[]>([]);
    const [filterValue, setFilterValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Загрузка CSV данных
    useEffect(() => {
        const loadCSVData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Загружаем CSV файл из public директории
                const response = await fetch('./data.csv');

                if (!response.ok) {
                    throw new Error(`Ошибка загрузки: ${response.status}`);
                }

                const csvText = await response.text();
                const parsedData = parseCSV(csvText);

                setData(parsedData);
                setFilteredData(parsedData); // Изначально показываем все данные
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
                console.error('Ошибка загрузки CSV:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadCSVData();
    }, []);

    // Функция парсинга CSV (базовая реализация)
    const parseCSV = (csvText: string): TableRow[] => {
        const lines = csvText.split('\n');
        const result: TableRow[] = [];

        if (lines.length === 0) return result;

        // Предполагаем, что первая строка - заголовки
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
    };

    // Функция для корректного парсинга строк CSV (учитывает кавычки)
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Двойные кавычки внутри кавычек
                    currentValue += '"';
                    i++;
                } else {
                    // Начало или конец кавычек
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Конец значения
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        // Добавляем последнее значение
        result.push(currentValue.trim());
        return result;
    };

    // Применение фильтра
    const applyFilter = () => {
        if (!filterValue.trim()) {
            setFilteredData(data);
            return;
        }

        const filtered = data.filter(row => {
            const keys = Object.keys(row);
            // Предполагаем, что 5-й столбец имеет индекс 4 (т.к. индексация с 0)
            const fifthColumnKey = keys[4];

            if (!fifthColumnKey) return false;

            const cellValue = row[fifthColumnKey].toLowerCase();
            const searchValue = filterValue.toLowerCase().trim();

            return cellValue.includes(searchValue);
        });

        setFilteredData(filtered);
    };

    // Обработка нажатия Enter
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyFilter();
        }
    };

    // Сброс фильтра
    const resetFilter = () => {
        setFilterValue('');
        setFilteredData(data);
    };

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
                <h1>CSV Таблица с фильтром</h1>
            </header>

            <main className="main-content">
                <div className="filter-controls">
                    <div className="input-group">
                        <label htmlFor="filterInput">
                            Фильтр по 5-му столбцу ({Object.keys(data[0] || {})[4] || 'Столбец 5'}):
                        </label>
                        <input
                            id="filterInput"
                            type="text"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Введите значение для фильтрации..."
                            className="filter-input"
                        />
                    </div>

                    <div className="button-group">
                        <button
                            onClick={applyFilter}
                            className="btn btn-primary"
                        >
                            Применить фильтр
                        </button>

                        <button
                            onClick={resetFilter}
                            className="btn btn-secondary"
                        >
                            Сбросить фильтр
                        </button>
                    </div>

                    <div className="stats">
                        Найдено строк: {filteredData.length} из {data.length}
                    </div>
                </div>

                <div className="table-container">
                    {filteredData.length > 0 ? (
                        <table className="data-table">
                            <thead>
                            <tr>
                                {Object.keys(filteredData[0]).map((header, index) => (
                                    <th key={index} className={index === 4 ? 'fifth-column' : ''}>
                                        {header}
                                        {index === 4 && ' (фильтр)'}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filteredData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {Object.values(row).map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className={cellIndex === 4 ? 'fifth-column highlighted' : ''}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-data">
                            {filterValue ? 'Нет данных, соответствующих фильтру' : 'Нет данных для отображения'}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;