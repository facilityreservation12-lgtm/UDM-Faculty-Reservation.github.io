const users = [
  { id: "001", name: "Chloe M. Baldwin", email: "chloe@udm.edu", role: "ADMIN", status: "ONLINE" },
  { id: "002", name: "Violet G. Mercado", email: "violet@udm.edu", role: "ADMIN", status: "ONLINE" },
  { id: "003", name: "Brandon B. Perez", email: "brandon@udm.edu", role: "ADMIN", status: "OFFLINE" }
];

let editingUserId = null;

function loadUsers() {
  const table = document.getElementById("userTableBody");
  table.innerHTML = "";
  users.forEach(user => {
    table.innerHTML += `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}<br><small>${user.email}</small></td>
        <td>${user.role}</td>
        <td style="color:${user.status === 'ONLINE' ? 'green' : 'red'}">${user.status}</td>
        <td>
          <button class="edit-btn" onclick="openEditModal('${user.id}')">EDIT</button>
          <button class="delete-btn" onclick="confirmDelete('${user.id}')">DELETE</button>
        </td>
      </tr>
    `;
  });
}

function openAddModal() {
  editingUserId = null;
  document.getElementById("modalTitle").textContent = "Add Admin";
  document.getElementById("userForm").reset();
  document.getElementById("userModal").style.display = "flex";
}

function openEditModal(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;

  editingUserId = id;
  document.getElementById("modalTitle").textContent = "Edit Admin";
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userPassword").value = "******";
  document.getElementById("userRePassword").value = "******";
  document.getElementById("userRole").value = user.role;
  document.getElementById("userModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("userModal").style.display = "none";
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

document.getElementById("userForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const role = document.getElementById("userRole").value;

  if (editingUserId) {
    const user = users.find(u => u.id === editingUserId);
    user.name = name;
    user.email = email;
    user.role = role;
  } else {
    users.push({
      id: String(users.length + 1).padStart(3, "0"),
      name,
      email,
      role,
      status: "OFFLINE"
    });
  }
  closeModal();
  loadUsers();
});

function confirmDelete(id) {
  document.getElementById("confirmPopup").style.display = "flex";
  document.getElementById("confirmYes").onclick = () => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) users.splice(index, 1);
    closeConfirm();
    loadUsers();
  };
}

function closeConfirm() {
  document.getElementById("confirmPopup").style.display = "none";
}

window.onload = loadUsers;
