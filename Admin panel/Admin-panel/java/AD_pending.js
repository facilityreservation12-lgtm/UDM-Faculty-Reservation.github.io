document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.getElementById('statusModal').style.display = 'flex';
  });
});

document.getElementById('closeStatusModalBtn').onclick = function() {
  document.getElementById('statusModal').style.display = 'none';
};

document.getElementById('approveBtn').onclick = function() {
  alert('Approved!');
  document.getElementById('statusModal').style.display = 'none';
};

document.getElementById('disapproveBtn').onclick = function() {
  alert('Disapproved!');
  document.getElementById('statusModal').style.display = 'none';
};