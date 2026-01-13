let tableData = [];
let currentRequestId = 0;

/* Load subfolders */
// function loadSubFolders() {
//     console.log('loadSubFolders')
//   const folderId = document.getElementById("folderId").value;

//   fetch(`https://search-application-d4c3.onrender.com/folders/${folderId}`)
//     .then(res => res.json())
//     .then(data => {
//       const select = document.getElementById("subFolderSelect");
//       select.innerHTML = `<option>Select Subfolder</option>`;
//       data.forEach(f => {
//         select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
//       });
//       console.log('data',data)
//     });
// }
function loadSubFolders() {
    const folderId = document.getElementById("folderId").value.trim();

    if (!folderId) {
        alert("Please enter folder ID");
        return;
    }

    fetch(`https://search-application-d4c3.onrender.com/folders/${folderId}`)
        .then(res => res.json())
        .then(data => {
            console.log("Subfolders:", data); // 🔍 DEBUG

            const select = document.getElementById("subFolderSelect");
            select.innerHTML = `<option value="">Select Subfolder</option>`;

            data.forEach(folder => {
                const option = document.createElement("option");
                option.value = folder.id;
                option.textContent = folder.name;
                select.appendChild(option);
            });
        })
        .catch(err => {
            console.error("Error loading folders", err);
        });
}

/* Load Excel files */
function loadFiles() {
    console.log('loadFiles');

    const folderId = document.getElementById("subFolderSelect").value;

    fetch(`https://search-application-d4c3.onrender.com/files/${folderId}`)
        .then(res => res.json())
        .then(data => {
            console.log('data11', data); // ✅ CORRECT PLACE

            const select = document.getElementById("fileSelect");
            select.innerHTML = `<option value="">Select Excel</option>`;

            data.forEach(f => {
                select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
            });
        })
        .catch(err => console.error("Error loading files", err));
}
/* Load columns + data */
function loadColumns() {
    const fileId = document.getElementById("fileSelect").value;
    if (!fileId) return;

    const requestId = ++currentRequestId;

    // Reset UI immediately
    document.getElementById("columnSelect").innerHTML =
        `<option>Loading...</option>`;
    renderTable([]);

    fetch(`https://search-application-d4c3.onrender.com/columns/${fileId}`)
        .then(res => res.json())
        .then(cols => {
            // Ignore stale responses
            if (requestId !== currentRequestId) return;

            if (!Array.isArray(cols) || cols.length === 0) {
                retryLoadColumns(fileId, requestId);
                return;
            }

            const select = document.getElementById("columnSelect");
            select.innerHTML = `<option value="">Select Column</option>`;

            cols.forEach(col => {
                const opt = document.createElement("option");
                opt.value = col;
                opt.textContent = col;
                select.appendChild(opt);
            });

            // ✅ THIS WAS MISSING
            loadData(fileId);
        })
        .catch(err => console.error("Column load error", err));
}

function retryLoadColumns(fileId, requestId, retries = 2) {
    if (retries === 0) return;

    setTimeout(() => {
        fetch(`https://search-application-d4c3.onrender.com/columns/${fileId}`)
            .then(res => res.json())
            .then(cols => {
                if (requestId !== currentRequestId) return;

                if (Array.isArray(cols) && cols.length > 0) {
                    const select = document.getElementById("columnSelect");
                    select.innerHTML = `<option>Select Column</option>`;
                    cols.forEach(col => {
                        const opt = document.createElement("option");
                        opt.value = col;
                        opt.textContent = col;
                        select.appendChild(opt);
                    });
                } else {
                    retryLoadColumns(fileId, requestId, retries - 1);
                }
            });
    }, 500); // wait before retry
}
function loadData(fileId) {
    const requestId = currentRequestId;

    fetch(`https://search-application-d4c3.onrender.com/read-excel/${fileId}`)
        .then(res => res.json())
        .then(data => {
            if (requestId !== currentRequestId) return;

            if (!Array.isArray(data) || data.length === 0) {
                retryLoadData(fileId, requestId);
                return;
            }

            tableData = data;
            renderTable(data);
        });
}
function retryLoadData(fileId, requestId, retries = 2) {
    if (retries === 0) {
        renderTable([]);
        return;
    }

    setTimeout(() => {
        fetch(`https://search-application-d4c3.onrender.com/read-excel/${fileId}`)
            .then(res => res.json())
            .then(data => {
                if (requestId !== currentRequestId) return;

                if (Array.isArray(data) && data.length > 0) {
                    tableData = data;
                    renderTable(data);
                } else {
                    retryLoadData(fileId, requestId, retries - 1);
                }
            });
    }, 700);
}

/* Filter table */
function filterTable() {
    const column = document.getElementById("columnSelect").value;
    const input = document.getElementById("filterInput").value.toLowerCase().trim();

    // If no column selected or no input → show all
    if (!column || !input) {
        renderTable(tableData);
        return;
    }

    // 🔹 Split leading/trailing spaces, remove empty values
    const searchValues = input
        .split(",")
        .map(v => v.trim())
        .filter(v => v.length > 0);

    const filtered = tableData.filter(row => {
        const cellValue = String(row[column] ?? "").toLowerCase().trim();

        // ✅ Match ANY entered value
        return searchValues.some(search =>
            cellValue === search || cellValue.includes(search)
        );
    });

    renderTable(filtered);
}

function renderTable(data) {
    const thead = document.getElementById("tableHeader");
    const tbody = document.getElementById("tableBody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="100%">No data found</td></tr>`;
        return;
    }

    const headers = Object.keys(data[0]);

    // Render headers
    headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        thead.appendChild(th);
    });

    // Render rows
    data.forEach(row => {
        const tr = document.createElement("tr");
        headers.forEach(h => {
            const td = document.createElement("td");
            td.textContent = row[h] ?? "";
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

