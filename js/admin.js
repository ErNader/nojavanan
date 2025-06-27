import { supabase } from './config.js';

// --- Auth & User Info ---
const adminRole = localStorage.getItem('adminRole');
const adminName = localStorage.getItem('adminName');

if (!adminRole) {
    window.location.replace('login.html');
}

// --- Constants ---
const ROLES = { ADMIN1: 'admin1', ADMIN2: 'admin2', ADMIN3: 'admin3' };
const ROLE_MAP = { [ROLES.ADMIN1]: 'مدیر کل', [ROLES.ADMIN2]: 'مدیر جوایز', [ROLES.ADMIN3]: 'مشاهده‌گر' };

// --- Event Dates ---
// Helper to get date strings in 'YYYY-MM-DD' format
function getLocalDate(date) {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
}

// --- Configuration for Event Nights ---
const TOTAL_EVENT_NIGHTS = 11;
// Set the date for the *first* night of the event.
// All other nights will be calculated from this date.
const EVENT_START_DATE = new Date();
// Assuming today is the second day, so the event started yesterday.
EVENT_START_DATE.setDate(EVENT_START_DATE.getDate() - 1); 

const todayStr = getLocalDate(new Date());

const eventNights = Array.from({ length: TOTAL_EVENT_NIGHTS }, (_, i) => {
    const nightDate = new Date(EVENT_START_DATE);
    nightDate.setDate(EVENT_START_DATE.getDate() + i);
    const nightDateStr = getLocalDate(nightDate);
    const dayNumber = i + 1;

    return {
        name: `شب ${dayNumber}` + (nightDateStr === todayStr ? ' (امروز)' : ''),
        date: nightDateStr
    };
});

// --- DOM Elements ---
const roleDisplay = document.getElementById('admin-role-display');
const logoutButton = document.getElementById('logout-button');
const searchInput = document.getElementById('user-search-input');
const awardSearchInput = document.getElementById('award-search');
const addUserModal = document.getElementById('add-user-modal');
const addUserForm = document.getElementById('add-user-form');
const editUserModal = document.getElementById('edit-user-modal');
const editUserForm = document.getElementById('edit-user-form');
const addAwardForm = document.getElementById('add-award-form');
const usersTableBody = document.getElementById('users-table')?.querySelector('tbody');
const awardsTableBody = document.getElementById('awards-table')?.querySelector('tbody');
const childSelect = document.getElementById('award-child-select');
const awardChildSearch = document.getElementById('award-child-search');
const exportExcelButton = document.getElementById('export-excel-button');
const attendanceCount = document.getElementById('attendance-count');
const usersTable = document.getElementById('users-table')?.querySelector('tbody');
const awardsTable = document.getElementById('awards-table')?.querySelector('tbody');
const ceremonyTimeInput = document.getElementById('ceremony-time');
const setTimeButton = document.getElementById('set-time-btn');
const attendanceCountElem = document.getElementById('attendance-count');
const dateSelector = document.getElementById('event-date-selector');

// --- State ---
let allUsers = [];
let fuse;
let allAwards = [];
let awardsFuse;
let selectedNightDate = eventNights.find(n => n.date === getLocalDate(new Date()))?.date || eventNights[0].date;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    applyPermissions();
    populateDateSelector(); // Populate date selector first
    fetchAllData();
    feather.replace();
});

// --- Navigation ---
function navigateTo(targetId) {
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(targetId);
    document.querySelectorAll(`.nav-link[data-target="${targetId}"]`).forEach(link => {
        if (link) link.classList.add('active');
    });

    if (targetSection) targetSection.classList.add('active');
}

// --- Core Functions ---
function applyPermissions() {
    roleDisplay.textContent = `${adminName} (${ROLE_MAP[adminRole] || 'ناشناس'})`;

    document.querySelectorAll('.requires-permission').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.actions-header').forEach(el => el.style.display = 'none');
    document.querySelector('.nav-link[data-target="user-management"]').style.display = 'flex';
    document.querySelector('.nav-link[data-target="awards-management"]').style.display = 'flex';

    if (adminRole === ROLES.ADMIN1) {
        document.querySelectorAll('.admin1-permission').forEach(el => { el.style.display = 'flex'; });
        document.querySelectorAll('.admin2-permission').forEach(el => { el.style.display = 'block'; });
        document.querySelectorAll('.actions-header').forEach(el => el.style.display = 'table-cell');
        navigateTo('user-management');
    } else if (adminRole === ROLES.ADMIN2) {
        document.querySelectorAll('.admin2-permission').forEach(el => { el.style.display = 'block'; });
        document.querySelector('#awards-management .actions-header').style.display = 'table-cell';
        // Hide user management for awards admin
        document.querySelector('.nav-link[data-target="user-management"]').style.display = 'none';
        navigateTo('awards-management');
    } else if (adminRole === ROLES.ADMIN3) {
        navigateTo('user-management');
    }
}

function setupEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    });
    window.onclick = e => document.querySelectorAll('.modal').forEach(m => { if (e.target === m) m.style.display = 'none'; });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(link.dataset.target);
            feather.replace();
        });
    });

    if(dateSelector) {
        dateSelector.addEventListener('change', e => {
            selectedNightDate = e.target.value;
            renderUsers(allUsers); // Re-render users for the selected date
        });
    }

    if(document.getElementById('add-user-btn'))
        document.getElementById('add-user-btn').onclick = () => openUserModal();
    
    addUserForm.addEventListener('submit', e => handleUserForm(e, false));
    editUserForm.addEventListener('submit', e => handleUserForm(e, true));
    addAwardForm.addEventListener('submit', handleAwardForm);
    
    exportExcelButton.addEventListener('click', handleExcelExport);
    logoutButton.addEventListener('click', () => { localStorage.clear(); window.location.replace('login.html'); });
    
    searchInput.addEventListener('keyup', e => {
        const term = e.target.value.trim();
        if (!term) return renderUsers(allUsers);
        const results = fuse.search(normalizeString(term));
        renderUsers(results.map(r => r.item));
    });
    
    awardChildSearch.addEventListener('keyup', e => {
        const searchTerm = e.target.value.toLowerCase();
        Array.from(childSelect.options).forEach(option => {
            const optionText = option.text.toLowerCase();
            option.style.display = optionText.includes(searchTerm) ? '' : 'none';
        });
    });

    if (awardSearchInput) {
        awardSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            if (searchTerm.trim() === '') {
                renderAwards(allAwards);
                return;
            }
            const results = awardsFuse.search(searchTerm);
            renderAwards(results.map(r => r.item));
        });
    }
}

async function fetchAllData() {
    await Promise.all([fetchUsers(), fetchAwards()]);
}

async function fetchUsers() {
    const { data, error } = await supabase.from('children').select('*, attendance(ceremony_date)').order('created_at', { ascending: false });
    if (error) return console.error('Error fetching users:', error);
    allUsers = data;
    
    fuse = new Fuse(allUsers, { keys: ['full_name', 'primary_parent_phone'], threshold: 0.4, ignoreLocation: true });
    renderUsers(allUsers);
    populateChildrenSelect(allUsers);
}

async function fetchAwards() {
    if (!awardsTable) return;

    const { data, error } = await supabase
        .from('awards')
        .select('*, children(full_name)')
        .order('awarded_at', { ascending: false });

    if (error) {
        console.error('Error fetching awards:', error);
        showToast('خطا در دریافت لیست جوایز', 'error');
        return;
    }

    allAwards = data;
    initializeAwardsFuse(allAwards);
    renderAwards(allAwards);
}

async function handleUserForm(e, isEdit = false) {
    e.preventDefault();
    const form = isEdit ? editUserForm : addUserForm;
    const id = isEdit ? form.querySelector('#edit-user-id').value : null;

    const userData = {
        full_name: form.querySelector('[name="full_name"]').value,
        age: form.querySelector('[name="age"]').value || null,
        primary_parent_phone: form.querySelector('[name="primary_phone"]').value,
        secondary_parent_phone: form.querySelector('[name="secondary_phone"]').value,
        medical_history: form.querySelector('[name="medical_history"]').value,
        can_leave_unaccompanied: form.querySelector('[name="leave_unaccompanied"]').checked,
    };

    if (isEdit) {
        const { error } = await supabase.from('children').update(userData).eq('id', id);
        if (error) {
            alert('خطا در ذخیره اطلاعات: ' + error.message);
        } else {
            form.closest('.modal').style.display = 'none';
            fetchUsers();
        }
    } else {
        const { data: newChild, error } = await supabase.from('children').insert(userData).select().single();
        if (error) {
            alert('خطا در افزودن کاربر: ' + error.message);
        } else {
            if (newChild) {
                const { error: attendanceError } = await supabase.from('attendance').insert({ 
                    child_id: newChild.id,
                    ceremony_date: selectedNightDate // Use selected night date
                });
                if (attendanceError) {
                    if (attendanceError.code === '23505') { 
                        showToast('کاربر افزوده شد (حاضری قبلا ثبت شده بود).');
                    } else {
                        alert(`کاربر افزوده شد، اما در ثبت حاضری خطایی رخ داد: \n${attendanceError.message}`);
                    }
                } else {
                    showToast('کاربر با موفقیت افزوده و حاضری او ثبت شد.');
                }
            }
            form.reset();
            form.querySelector('[name="full_name"]').focus();
            fetchUsers();
        }
    }
}

async function handleAwardForm(e) {
    e.preventDefault();
    const awardData = {
        child_id: addAwardForm.querySelector('#award-child-select').value,
        reason: addAwardForm.querySelector('#award-reason').value,
        voucher_type: addAwardForm.querySelector('#award-voucher').value,
        award_type: addAwardForm.querySelector('#award-type').value
    };
    if (!awardData.child_id || !awardData.reason) return alert('لطفا شرکت‌کننده و علت جایزه را مشخص کنید.');

    const { error } = await supabase.from('awards').insert([awardData]);
    if (error) alert('خطا در ثبت جایزه: ' + error.message);
    else {
        alert('جایزه با موفقیت ثبت شد.');
        addAwardForm.reset();
        fetchAwards();
    }
}

function handleExcelExport() {
    const headers = [
        'نام و نام خانوادگی', 'سن', 'تلفن اصلی', 'تلفن دوم', 'سابقه بیماری',
        'خروج بدون همراه', 'تعداد کل حاضری'
    ];

    // Add each event night as a header
    eventNights.forEach(night => headers.push(night.name));

    const dataToExport = allUsers.map(user => {
        const userRow = {
            'نام و نام خانوادگی': user.full_name,
            'سن': user.age || '',
            'تلفن اصلی': user.primary_parent_phone,
            'تلفن دوم': user.secondary_parent_phone || '',
            'سابقه بیماری': user.medical_history || '',
            'خروج بدون همراه': user.can_leave_unaccompanied ? 'بله' : 'خیر',
            'تعداد کل حاضری': user.attendance?.length || 0,
        };

        // For each night, check attendance and mark as 'حاضر' or 'غایب'
        eventNights.forEach(night => {
            userRow[night.name] = user.attendance.some(a => a.ceremony_date === night.date) ? 'حاضر' : 'غایب';
        });

        return userRow;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport, { header: headers });

    // Set column widths
    const colWidths = [
        { wch: 25 }, // Name
        { wch: 5 },  // Age
        { wch: 15 }, // Phone 1
        { wch: 15 }, // Phone 2
        { wch: 30 }, // Medical
        { wch: 15 }, // Leave alone
        { wch: 15 }, // Total
    ];
    eventNights.forEach(() => colWidths.push({ wch: 15 })); // Width for each night column
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حضور و غیاب');
    XLSX.writeFile(wb, 'لیست_حضور_و_غیاب_کامل.xlsx');
}

function renderUsers(users) {
    updateAttendanceCount(users, selectedNightDate);
    renderUsersForDesktop(users, selectedNightDate);
    renderUsersForMobile(users, selectedNightDate);
    feather.replace();
    applyPermissions();
}

function renderUsersForDesktop(users, ceremonyDate) {
    usersTableBody.innerHTML = users.map(user => {
        const hasAttended = user.attendance.some(a => a.ceremony_date === ceremonyDate);
        const attendanceButton = (adminRole === ROLES.ADMIN1 || adminRole === ROLES.ADMIN2) ? `
            <button 
                class="attendance-toggle ${hasAttended ? 'present' : 'absent'}" 
                onclick="toggleAttendance(${user.id}, ${hasAttended}, '${ceremonyDate}')">
                ${hasAttended ? 'حاضر' : 'غایب'}
            </button>
        ` : '';

        return `
            <tr>
                <td>${user.full_name}</td>
                <td>${user.age || '---'}</td>
                <td><a href="tel:${user.primary_parent_phone}">${user.primary_parent_phone}</a></td>
                <td>${user.secondary_parent_phone ? `<a href="tel:${user.secondary_parent_phone}">${user.secondary_parent_phone}</a>` : '---'}</td>
                <td title="${user.medical_history || ''}" style="cursor: help; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${user.medical_history || '---'}</td>
                <td>${user.can_leave_unaccompanied ? '✅' : '❌'}</td>
                <td>${user.attendance?.length || 0}</td>
                <td class="actions">
                    ${attendanceButton}
                    <button class="icon-button admin1-permission requires-permission" onclick="editUser(${user.id})" title="ویرایش" style="display:none;"><i data-feather="edit"></i></button>
                    <button class="icon-button admin1-permission requires-permission" onclick="deleteUser(${user.id})" title="حذف" style="display:none;"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderUsersForMobile(users, ceremonyDate) {
    const mobileContainer = document.getElementById('users-list-mobile');
    if (!mobileContainer) return;

    mobileContainer.innerHTML = users.map(user => {
        const hasAttended = user.attendance.some(a => a.ceremony_date === ceremonyDate);
        const attendanceButton = (adminRole === ROLES.ADMIN1 || adminRole === ROLES.ADMIN2) ? `
            <button 
                class="attendance-toggle ${hasAttended ? 'present' : 'absent'}" 
                onclick="toggleAttendance(${user.id}, ${hasAttended}, '${ceremonyDate}')">
                ${hasAttended ? 'حاضر' : 'غایب'}
            </button>
        ` : '';

        return `
            <div class="user-card">
                <div class="user-card-header">
                    <span class="user-card-name">${user.full_name}</span>
                    <span class="user-card-age">سن: ${user.age || '---'}</span>
                </div>
                <div class="user-card-body">
                    <div class="user-card-info">
                        <i data-feather="phone"></i>
                        <span><a href="tel:${user.primary_parent_phone || '---'}">${user.primary_parent_phone || '---'}</a></span>
                    </div>
                    ${user.secondary_parent_phone ? `
                        <div class="user-card-info">
                            <i data-feather="phone-call"></i>
                            <span><a href="tel:${user.secondary_parent_phone}">${user.secondary_parent_phone}</a></span>
                        </div>` : ''
                    }
                    <div class="user-card-info">
                        <i data-feather="check-circle"></i>
                        <span>تعداد حاضری: ${user.attendance?.length || 0}</span>
                    </div>
                    <div class="user-card-info">
                        <i data-feather="shield"></i>
                        <span>خروج : ${user.can_leave_unaccompanied ? '✅ ' : '❌ '}</span>
                    </div>
                    ${user.medical_history ? `
                        <div class="user-card-info medical">
                            <i data-feather="alert-triangle"></i>
                            <span title="${user.medical_history}">${user.medical_history}</span>
                        </div>` : ''
                    }
                </div>
                <div class="user-card-footer">
                    ${attendanceButton}
                    <div class="actions">
                        <button class="icon-button admin1-permission requires-permission" onclick="editUser(${user.id})" title="ویرایش" style="display:none;"><i data-feather="edit"></i></button>
                        <button class="icon-button admin1-permission requires-permission" onclick="deleteUser(${user.id})" title="حذف" style="display:none;"><i data-feather="trash-2"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAwards(awards) {
    renderAwardsForDesktop(awards);
    renderAwardsForMobile(awards);
    feather.replace();
    applyPermissions();
}

function renderAwardsForDesktop(awards) {
    awardsTableBody.innerHTML = awards.map(award => `
        <tr>
            <td>${award.children?.full_name || 'کاربر حذف شده'}</td>
            <td>${award.reason}</td>
            <td>${award.voucher_type || '---'}</td>
            <td>${award.award_type || '---'}</td>
            <td>${new Date(award.awarded_at).toLocaleDateString('fa-IR')}</td>
            <td class="actions">
                <button class="icon-button admin1-permission admin2-permission requires-permission" onclick="deleteAward(${award.id})" title="حذف" style="display:none;"><i data-feather="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderAwardsForMobile(awards) {
    const mobileContainer = document.getElementById('awards-list-mobile');
    if (!mobileContainer) return;
    mobileContainer.innerHTML = awards.map(award => `
        <div class="award-card">
            <div class="award-card-header">
                <span class="award-card-name">${award.children?.full_name || 'کاربر حذف شده'}</span>
                <span class="award-card-date">${new Date(award.awarded_at).toLocaleDateString('fa-IR')}</span>
            </div>
            <div class="award-card-body">
                <div class="award-card-info">
                    <strong>علت:</strong>
                    <span>${award.reason}</span>
                </div>
                ${award.voucher_type ? `
                    <div class="award-card-info">
                        <strong>نوع بن:</strong>
                        <span>${award.voucher_type}</span>
                    </div>` : ''
                }
                ${award.award_type ? `
                    <div class="award-card-info">
                        <strong>نوع جایزه:</strong>
                        <span>${award.award_type}</span>
                    </div>` : ''
                }
            </div>
            <div class="award-card-footer">
                 <button class="icon-button admin1-permission admin2-permission requires-permission" onclick="deleteAward(${award.id})" title="حذف" style="display:none;">
                    <i data-feather="trash-2"></i>
                    <span>حذف جایزه</span>
                </button>
            </div>
        </div>
    `).join('');
}

function populateChildrenSelect(users) {
    if (!childSelect) return;
    childSelect.innerHTML = '<option value="">یک نفر را انتخاب کنید</option>';
    users.forEach(user => {
        childSelect.insertAdjacentHTML('beforeend', `<option value="${user.id}">${user.full_name}</option>`);
    });
}

function openUserModal(id = null) {
    const modal = id ? editUserModal : addUserModal;
    const form = id ? editUserForm : addUserForm;
    form.reset();

    if (id) {
        const user = allUsers.find(u => u.id === id);
        if (!user) return;
        form.querySelector('#edit-user-id').value = user.id;
        form.querySelector('[name="full_name"]').value = user.full_name;
        form.querySelector('[name="age"]').value = user.age;
        form.querySelector('[name="primary_phone"]').value = user.primary_parent_phone;
        form.querySelector('[name="secondary_phone"]').value = user.secondary_parent_phone;
        form.querySelector('[name="medical_history"]').value = user.medical_history;
        form.querySelector('[name="leave_unaccompanied"]').checked = user.can_leave_unaccompanied;
    }
    modal.style.display = 'flex';
}

function populateDateSelector() {
    if (!dateSelector) return;
    dateSelector.innerHTML = eventNights
        .map(night => `<option value="${night.date}" ${night.date === selectedNightDate ? 'selected' : ''}>${night.name}</option>`)
        .join('');
}

function updateAttendanceCount(users, date) {
    if (!attendanceCount) return;
    const count = users.filter(u => u.attendance.some(a => a.ceremony_date === date)).length;
    attendanceCount.textContent = count;
}

// Make functions globally accessible
window.toggleAttendance = async (userId, hasAttended, ceremonyDate) => {
    if (hasAttended) {
        // Delete the record
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('child_id', userId)
            .eq('ceremony_date', ceremonyDate);
        if (error) {
            alert('خطا در حذف حاضری: ' + error.message);
        }
    } else {
        // Insert the record
        const { error } = await supabase
            .from('attendance')
            .insert({ child_id: userId, ceremony_date: ceremonyDate });
        if (error) {
            alert('خطا در ثبت حاضری: ' + error.message);
        }
    }
    // Refresh data to show the change
    fetchUsers();
};
window.editUser = id => openUserModal(id);
window.deleteUser = async (id) => {
    if (confirm('آیا از حذف این کاربر و تمام سوابق او اطمینان دارید؟')) {
        const { error } = await supabase.from('children').delete().eq('id', id);
        if (error) alert('خطا: ' + error.message);
        else fetchUsers();
    }
};
window.deleteAward = async (id) => {
    if(confirm('آیا از حذف این جایزه اطمینان دارید؟')){
        const {error} = await supabase.from('awards').delete().eq('id', id);
        if(error) alert('خطا در حذف: ' + error.message);
        else fetchAwards();
    }
};
window.openUserModal = openUserModal;

function normalizeString(str) { return str ? str.replace(/ي/g, 'ی').replace(/ك/g, 'ک') : ''; }

function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize Fuse.js for awards
function initializeAwardsFuse(awards) {
    const options = {
        keys: ['children.full_name', 'reason', 'voucher_type', 'award_type'],
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2,
    };
    awardsFuse = new Fuse(awards, options);
}

// ... other functions to be filled in ... 