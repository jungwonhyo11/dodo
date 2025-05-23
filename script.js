// 나라장터 API 연동 및 입찰/낙찰 정보 수집 시스템

// 전역 변수 및 상수 정의
const API_BASE_URL = 'https://apis.data.go.kr/1230000/BidPublicInfoService';
const API_KEY = '발급받은_API_키_입력'; // 실제 사용 시 발급받은 API 키로 교체 필요

// 데이터 저장소
let bidData = [];
let awardData = [];
let companyData = [];

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // 모바일 메뉴 토글 기능
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }

    // SMS 폼 제출 이벤트 리스너
    const smsForm = document.getElementById('smsForm');
    if (smsForm) {
        smsForm.addEventListener('submit', handleSmsFormSubmit);
    }

    // 초기 데이터 로드
    loadInitialData();
});

/**
 * 초기 데이터 로드 함수
 */
async function loadInitialData() {
    try {
        // 로딩 상태 표시
        showLoadingState(true);
        
        // 최근 입찰 정보 가져오기
        await fetchRecentBids();
        
        // 로딩 상태 해제
        showLoadingState(false);
    } catch (error) {
        console.error('초기 데이터 로드 중 오류 발생:', error);
        showErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
        showLoadingState(false);
    }
}

/**
 * 로딩 상태 표시 함수
 * @param {boolean} isLoading - 로딩 중인지 여부
 */
function showLoadingState(isLoading) {
    // 로딩 인디케이터 구현 (필요시 HTML에 로딩 요소 추가)
    // 예: document.getElementById('loadingIndicator').style.display = isLoading ? 'block' : 'none';
}

/**
 * 에러 메시지 표시 함수
 * @param {string} message - 표시할 에러 메시지
 */
function showErrorMessage(message) {
    alert(message); // 기본 알림으로 표시 (필요시 UI 요소로 대체)
}

/**
 * 나라장터 API에서 최근 입찰 정보 가져오기
 */
async function fetchRecentBids() {
    try {
        const url = `${API_BASE_URL}/getBidPblancListInfoServc?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&inqryDiv=1&type=json`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 데이터 처리 및 화면에 표시
        if (data.response && data.response.body && data.response.body.items) {
            bidData = data.response.body.items;
            displayBidData(bidData);
        } else {
            console.warn('API에서 유효한 데이터를 받지 못했습니다:', data);
        }
    } catch (error) {
        console.error('입찰 정보 가져오기 실패:', error);
        throw error;
    }
}

/**
 * 입찰 정보를 화면에 표시
 * @param {Array} bids - 표시할 입찰 정보 배열
 */
function displayBidData(bids) {
    const bidListContainer = document.getElementById('bidList');
    if (!bidListContainer) return;
    
    bidListContainer.innerHTML = '';
    
    if (!bids || bids.length === 0) {
        bidListContainer.innerHTML = '<div class="no-data">입찰 정보가 없습니다.</div>';
        return;
    }
    
    bids.forEach(bid => {
        const bidItem = document.createElement('div');
        bidItem.className = 'bid-item';
        bidItem.innerHTML = `
            <div class="bid-header">
                <h4>${bid.bidNtceNm || '제목 없음'}</h4>
                <span class="bid-date">${formatDate(bid.bidNtceDt)}</span>
            </div>
            <div class="bid-body">
                <p><strong>공고번호:</strong> ${bid.bidNtceNo || '-'}</p>
                <p><strong>발주기관:</strong> ${bid.ntceInsttNm || '-'}</p>
                <p><strong>예산금액:</strong> ${formatCurrency(bid.presmptPrce) || '-'}</p>
                <p><strong>입찰마감일:</strong> ${formatDate(bid.bidClseDt) || '-'}</p>
            </div>
            <div class="bid-footer">
                <button class="detail-btn" data-bid-id="${bid.bidNtceNo}">상세정보</button>
            </div>
        `;
        
        bidListContainer.appendChild(bidItem);
        
        // 상세정보 버튼 이벤트 리스너 추가
        const detailBtn = bidItem.querySelector('.detail-btn');
        if (detailBtn) {
            detailBtn.addEventListener('click', () => fetchBidDetail(bid.bidNtceNo));
        }
    });
}

/**
 * 입찰 상세 정보 가져오기
 * @param {string} bidId - 입찰 공고 번호
 */
async function fetchBidDetail(bidId) {
    try {
        showLoadingState(true);
        
        const url = `${API_BASE_URL}/getBidPblancDetailInfoServc?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&inqryDiv=1&bidNtceNo=${bidId}&type=json`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.response.body && data.response.body.items) {
            const detailData = data.response.body.items[0];
            displayBidDetail(detailData);
            
            // 낙찰 정보가 있으면 함께 가져오기
            if (detailData.pblancState === '낙찰') {
                fetchAwardInfo(bidId);
            }
        } else {
            console.warn('API에서 유효한 상세 데이터를 받지 못했습니다:', data);
        }
        
        showLoadingState(false);
    } catch (error) {
        console.error('입찰 상세 정보 가져오기 실패:', error);
        showErrorMessage('상세 정보를 불러오는 중 오류가 발생했습니다.');
        showLoadingState(false);
    }
}

/**
 * 입찰 상세 정보를 화면에 표시
 * @param {Object} detail - 표시할 입찰 상세 정보
 */
function displayBidDetail(detail) {
    // 상세 정보 표시 요소 업데이트
    document.getElementById('detailTitle').textContent = detail.bidNtceNm || '-';
    document.getElementById('detailOrg').textContent = detail.ntceInsttNm || '-';
    document.getElementById('detailDate').textContent = formatDate(detail.bidNtceDt) || '-';
    document.getElementById('detailDeadline').textContent = formatDate(detail.bidClseDt) || '-';
    document.getElementById('detailAmount').textContent = formatCurrency(detail.presmptPrce) || '-';
    document.getElementById('detailLocation').textContent = detail.bidNtceRegion || '-';
    
    // 공고 내용 표시
    document.getElementById('announcementContent').textContent = detail.bidNtceDtlsContent || '상세 내용이 없습니다.';
    
    // 상세 정보 섹션 표시
    document.getElementById('detail-section').style.display = 'block';
    
    // 페이지 스크롤 이동
    document.getElementById('detail-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 낙찰 정보 가져오기
 * @param {string} bidId - 입찰 공고 번호
 */
async function fetchAwardInfo(bidId) {
    try {
        const url = `${API_BASE_URL}/getBidPblancListInfoServc?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&inqryDiv=2&bidNtceNo=${bidId}&type=json`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.response.body && data.response.body.items) {
            const awardData = data.response.body.items[0];
            displayAwardInfo(awardData);
            
            // 낙찰 업체 정보 가져오기
            if (awardData.sucsfbidCmpnyRegistNo) {
                fetchCompanyInfo(awardData.sucsfbidCmpnyRegistNo);
            }
        } else {
            console.warn('API에서 유효한 낙찰 데이터를 받지 못했습니다:', data);
        }
    } catch (error) {
        console.error('낙찰 정보 가져오기 실패:', error);
    }
}

/**
 * 낙찰 정보를 화면에 표시
 * @param {Object} award - 표시할 낙찰 정보
 */
function displayAwardInfo(award) {
    // 낙찰 정보 표시 요소 업데이트
    document.getElementById('winnerCompany').textContent = award.sucsfbidCmpnyNm || '-';
    document.getElementById('winnerRepresentative').textContent = award.sucsfbidCmpnyRprsntvNm || '-';
    document.getElementById('winnerRegistration').textContent = award.sucsfbidCmpnyRegistNo || '-';
    document.getElementById('projectPeriod').textContent = award.ctrctPd || '-';
    document.getElementById('projectAmount').textContent = formatCurrency(award.sucsfbidAmount) || '-';
    document.getElementById('bidRate').textContent = award.sucsfbidRate ? `${award.sucsfbidRate}%` : '-';
}

/**
 * 업체 정보 가져오기
 * @param {string} registNo - 사업자등록번호
 */
async function fetchCompanyInfo(registNo) {
    try {
        // 실제로는 업체 정보 API가 필요하지만, 예시로 가상의 API 호출 구현
        // 실제 구현 시에는 적절한 API로 대체 필요
        
        // 가상의 업체 정보 (실제 구현 시 API 응답으로 대체)
        const companyInfo = {
            address: '서울특별시 강남구 테헤란로 123',
            contact: '02-1234-5678',
            email: 'contact@company.com'
        };
        
        // 업체 정보 표시
        document.getElementById('winnerAddress').textContent = companyInfo.address;
        document.getElementById('winnerContact').textContent = companyInfo.contact;
        document.getElementById('winnerEmail').textContent = companyInfo.email;
        
        // 업체 정보 저장
        companyData.push({
            registNo: registNo,
            ...companyInfo
        });
    } catch (error) {
        console.error('업체 정보 가져오기 실패:', error);
    }
}

/**
 * 품목별 입찰 정보 검색
 * @param {string} keyword - 검색 키워드
 */
async function searchBidsByCategory(keyword) {
    try {
        showLoadingState(true);
        
        const url = `${API_BASE_URL}/getBidPblancListInfoServc?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&inqryDiv=1&bidNtceNm=${encodeURIComponent(keyword)}&type=json`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response && data.response.body && data.response.body.items) {
            bidData = data.response.body.items;
            displayBidData(bidData);
        } else {
            console.warn('API에서 유효한 검색 데이터를 받지 못했습니다:', data);
            displayBidData([]);
        }
        
        showLoadingState(false);
    } catch (error) {
        console.error('품목별 입찰 정보 검색 실패:', error);
        showErrorMessage('검색 중 오류가 발생했습니다.');
        showLoadingState(false);
    }
}

/**
 * 자동 수집 처리 함수
 */
function handleCollection() {
    // 자동 수집 기능 구현
    alert('입찰정보 자동 수집이 시작되었습니다. 이 기능은 서버 측 구현이 필요합니다.');
}

/**
 * SMS 폼 제출 처리 함수
 * @param {Event} event - 폼 제출 이벤트
 */
function handleSmsFormSubmit(event) {
    event.preventDefault();
    
    const companyName = document.getElementById('companyName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const email = document.getElementById('email').value;
    
    // 폼 유효성 검사
    if (!companyName || !phoneNumber || !email) {
        showErrorMessage('모든 필드를 입력해주세요.');
        return;
    }
    
    // SMS 서비스 신청 처리 (실제로는 서버 API 호출 필요)
    alert(`${companyName} 업체의 SMS 서비스 신청이 완료되었습니다. 입력하신 연락처(${phoneNumber})로 낙찰 정보가 발송됩니다.`);
    
    // 폼 초기화
    document.getElementById('smsForm').reset();
}

/**
 * 날짜 형식 변환 함수
 * @param {string} dateStr - 변환할 날짜 문자열
 * @returns {string} - 형식화된 날짜 문자열
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr; // 변환 실패 시 원본 반환
    }
}

/**
 * 금액 형식 변환 함수
 * @param {number|string} amount - 변환할 금액
 * @returns {string} - 형식화된 금액 문자열
 */
function formatCurrency(amount) {
    if (!amount) return '-';
    
    try {
        const num = parseFloat(amount);
        return num.toLocaleString('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0
        });
    } catch (e) {
        return amount; // 변환 실패 시 원본 반환
    }
}

// 검색 기능 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const keyword = document.getElementById('searchInput').value;
            if (keyword.trim()) {
                searchBidsByCategory(keyword);
            }
        });
    }
});