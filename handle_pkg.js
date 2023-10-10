const fs = require('fs');
const path = require('path');

// 获取版本号信息
let appVersion = null;
let appName = null;
fs.readFile('./package.json', 'utf-8', (err, data) => {
    if (err) {
        throw err;
    }
    const pkg = JSON.parse(data.toString());
    appVersion = pkg.version;
    appName = pkg.name;

    if (appVersion == null) {
        throw "版本号解析失败";
    }

    if (appName == null) {
        throw "应用名称解析失败";
    }

    // 创建 ./release/installation-packages 文件夹
    let targetPath = './release/installation-packages/';
    fs.mkdirSync(targetPath);

    // 从 ./release/${version} 文件夹下取出安装包 放到 ./release/installation-packages 下
    let commonPath = "./release/" + appVersion + "/";
    let fileName = appName + "_" + appVersion;
    let winSourceFile = commonPath + fileName + ".exe";
    let macSourceFile = commonPath + fileName + ".dmg";

    // 复制文件
    if (fs.existsSync(winSourceFile)) {
        fs.copyFileSync(winSourceFile, targetPath + fileName + ".exe");
    }

    if (fs.existsSync(macSourceFile)) {
        fs.copyFileSync(macSourceFile, targetPath + fileName + ".dmg");
    }
});


