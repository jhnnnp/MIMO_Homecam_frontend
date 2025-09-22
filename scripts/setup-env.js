#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 로컬 IP 주소 감지 함수
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // IPv4이고 내부 주소가 아닌 경우
            if (interface.family === 'IPv4' && !interface.internal) {
                // WiFi 또는 이더넷 인터페이스 우선
                if (name.includes('en') || name.includes('wl')) {
                    return interface.address;
                }
            }
        }
    }

    // 기본값으로 첫 번째 IPv4 주소 반환
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }

    return 'localhost';
}

/**
 * 환경 변수 파일 업데이트
 */
function updateEnvFile(ip) {
    const envPath = path.join(__dirname, '..', '.env');
    const envBackupPath = path.join(__dirname, '..', '.env.backup');

    // 백업 파일이 없으면 현재 .env를 백업
    if (!fs.existsSync(envBackupPath) && fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, envBackupPath);
        console.log('📋 백업 파일 생성:', envBackupPath);
    }

    // .env 파일 읽기
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    } else {
        // .env 파일이 없으면 예시 파일에서 복사
        const examplePath = path.join(__dirname, '..', 'env.example');
        if (fs.existsSync(examplePath)) {
            envContent = fs.readFileSync(examplePath, 'utf8');
        } else {
            console.error('❌ env.example 파일을 찾을 수 없습니다.');
            return;
        }
    }

    // IP 주소 업데이트
    const updatedContent = envContent
        .replace(/EXPO_PUBLIC_API_URL=http:\/\/[^\/]+:4001\/api/g, `EXPO_PUBLIC_API_URL=http://${ip}:4001/api`)
        .replace(/EXPO_PUBLIC_WS_URL=ws:\/\/[^\/]+:4001/g, `EXPO_PUBLIC_WS_URL=ws://${ip}:4001`)
        .replace(/EXPO_PUBLIC_WS_URL=ws:\/\/[^\n]+/g, `EXPO_PUBLIC_WS_URL=ws://${ip}:4001`);

    // 파일 쓰기
    fs.writeFileSync(envPath, updatedContent);

    console.log('✅ 환경 변수 파일 업데이트 완료');
    console.log('🌐 감지된 IP 주소:', ip);
    console.log('🔗 API URL:', `http://${ip}:4001/api`);
    console.log('🔌 WebSocket URL:', `ws://${ip}:4001`);
}

/**
 * 메인 실행 함수
 */
function main() {
    console.log('🚀 동적 IP 감지 및 환경 변수 설정 시작...');

    try {
        const ip = getLocalIP();
        updateEnvFile(ip);

        console.log('\n📱 이제 Android 폰에서 앱을 실행하면 자동으로 연결됩니다!');
        console.log('💡 IP가 변경되면 이 스크립트를 다시 실행하세요.');

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    main();
}

module.exports = { getLocalIP, updateEnvFile }; 