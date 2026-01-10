let tableData = [];
let headers = [];

document.getElementById('excelFile').addEventListener('change', handleFile);

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Read sheet as 2D array
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
        });

        /* 🔥 Row 3 is header (index 2) */
        headers = sheetData[2];

        /* Rows start from row 4 (index 3) */
        tableData = sheetData.slice(3).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ?? '';
            });
            return obj;
        });

        renderTable(tableData);
    };

    reader.readAsArrayBuffer(file);
}
function renderTable(data) {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    /* Header */
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        thead.appendChild(th);
    });

    /* Rows */
    data.forEach(row => {
        const tr = document.createElement('tr');

        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}
function filterTable() {
    const input = document
        .getElementById('filterInput')
        .value
        .toLowerCase()
        .trim();

    // If input is empty → show all rows
    if (!input) {
        renderTable(tableData);
        return;
    }

    // ✅ Split by comma, trim spaces, remove empty values
    const searchValues = input
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    console.log('searchValues',searchValues)
    const filteredData = tableData.filter(row => {
        const hospitalNo = String(row['Hospital No']).toLowerCase().trim();

        // ✅ Exact match against ANY entered value
        return searchValues.some(value => hospitalNo === value);
    });
    console.log(filteredData)
    renderTable(filteredData);
}

