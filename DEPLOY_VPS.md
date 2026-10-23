# Hinton Studio: Git main → VPS → /ai_studio

Mục tiêu: `https://hintonmedia.vn/ai_studio/`. Bạn cũng có nhắc `hintonmeidi.vn`: hãy xác nhận tên đúng và dùng server block HTTPS hiện có của tên đó. Hướng dẫn không thay website ở `/`, không mở thêm cổng công khai và không thao tác VPS tự động.

## 1. Chuẩn bị repository

Đẩy source hiện tại lên repository bạn sở hữu, nhánh `main`. Không đẩy `data/`, database, API key, `.scratch_key.txt`, ảnh cá nhân, video hoặc model weights. Những thứ này được Git ignore. Git chứa code, không tự mang theo dự án nam và 5 ảnh đã tạo: chuyển dữ liệu riêng ở bước 6.

Máy phát triển, khi đã có repository URL:

```bash
git remote add origin REPOSITORY_URL
git push -u origin main
```

Nếu repository đã có lịch sử: fetch và kiểm tra trước khi tích hợp; không force-push hoặc ghi đè main. Source đang dùng Next.js 15, Node `node:sqlite`; dùng Node.js 24 LTS cho VPS. `npm ci` cài lại dependency Linux, tuyệt đối không copy `node_modules` Windows.

## 2. Chuẩn bị VPS

Ví dụ Ubuntu/Debian dùng Nginx + systemd. Nếu VPS đang dùng Apache/Caddy/control panel, áp dụng proxy tương đương trong panel, không cài Nginx đè lên dịch vụ hiện có. VPS 3 CPU / 6 GB RAM phù hợp khởi đầu cho web điều khiển API; không phù hợp chạy model sinh video nặng tại máy.

SSH vào VPS bằng tài khoản của bạn; cài Node.js 24 LTS theo hướng dẫn nodejs.org. Xác nhận đường dẫn binary khớp `ExecStart` trong service:

```bash
node --version
command -v node
sudo apt-get update
sudo apt-get install -y git nginx apache2-utils ffmpeg python3 python3-venv
sudo adduser --system --group --home /opt/hinton-studio hintonstudio
sudo install -d -o hintonstudio -g hintonstudio /opt/hinton-studio
sudo -u hintonstudio git clone --branch main REPOSITORY_URL /opt/hinton-studio
```

Repository private: dùng SSH deploy key chỉ có quyền đọc; không đặt Git token trong URL hoặc file Git được commit. Các lệnh sau chạy dưới user `hintonstudio` (hoặc thêm `sudo -u hintonstudio`).

## 3. Build lần đầu

```bash
cd /opt/hinton-studio
npm ci
NEXT_PUBLIC_BASE_PATH=/ai_studio npm run build
mkdir -p data
```

`NEXT_PUBLIC_BASE_PATH` phải giống nhau lúc build và chạy. Đổi prefix phải build lại. Nếu VPS thiếu RAM khi build, giảm tải các tiến trình phụ hoặc tạo swap có kiểm soát; không dừng website hiện có để thử mò.

Tùy chọn ghép video thời trang bằng Python:

```bash
python3 -m venv .venv
.venv/bin/pip install -r deploy/requirements-fashion.txt
```

Tạo `/etc/hinton-studio.env` nếu cần:

```ini
FASHION_PYTHON=/opt/hinton-studio/.venv/bin/python
```

SeeCut là project ngoài nằm trên máy Windows hiện tại, không có trong repo này. Chức năng SeeCut cần cài riêng source và dependency của nó, rồi khai báo `SEECUT_DIR` và `SEECUT_PYTHON` trong env. Không có SeeCut vẫn dùng được canvas, thư viện và API tạo ảnh/video.

## 4. Chạy app độc lập với web hiện tại

Chạy các lệnh quản trị dưới root/sudo:

```bash
sudo cp /opt/hinton-studio/deploy/hinton-studio.service /etc/systemd/system/
# Nếu node không ở /usr/bin/node: sửa ExecStart trước khi chạy.
sudo systemctl daemon-reload
sudo systemctl enable --now hinton-studio
sudo systemctl status hinton-studio --no-pager
curl -I http://127.0.0.1:3210/ai_studio/
```

App chỉ lắng nghe `127.0.0.1:3210`; không cần mở firewall cổng 3210. Một instance systemd, không cluster nhiều worker vì dữ liệu SQLite và trạng thái job đang gắn với tiến trình.

## 5. Thêm đường dẫn /ai_studio vào website hiện có

Ứng dụng chưa có hệ thống tài khoản riêng; bảo vệ giao diện và API tính phí bằng Basic Auth:

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-hinton-studio studioadmin
sudo chmod 640 /etc/nginx/.htpasswd-hinton-studio
sudo chown root:www-data /etc/nginx/.htpasswd-hinton-studio
```

Nếu Nginx dùng group khác `www-data`, đổi theo user/group thực tế. `-c` chỉ dùng lần đầu, không chạy lại để thêm user vì sẽ ghi đè file.

Xem cấu hình đang dùng bằng `sudo nginx -T`, tìm `server_name` đúng tên miền và khối `listen 443 ssl`. Sao lưu file cấu hình đó. Chèn nội dung `deploy/nginx-ai-studio.conf` **bên trong server block HTTPS hiện có**. Không tạo server block trùng tên miền; không đổi `root`, `location /`, SSL hoặc upstream của website chính.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://hintonmedia.vn/
curl -I https://hintonmedia.vn/ai_studio/
curl -u studioadmin https://hintonmedia.vn/ai_studio/api/projects
```

`/ai_studio/` trả 401 khi chưa đăng nhập là đúng. Sau đăng nhập kiểm tra trang, CSS, tạo dự án, upload ảnh, xem ảnh/video, lưu Settings. Không cần yêu cầu tạo ảnh/video tính phí để kiểm tra deploy. Browser dùng HTTPS của website hiện có.

`proxy_pass` không có dấu `/` sau cổng để giữ prefix `/ai_studio`. Không tạo rewrite `/api` ở gốc vì có thể phá web cũ.

## 6. Chuyển dự án và 5 ảnh từ máy Windows

Git không chuyển database hoặc ảnh. Tạo SQLite snapshot bằng backup API, không copy riêng file `.db` đang bật WAL. Có thể dừng app phát triển trong lúc sao lưu nếu muốn tất cả media/graph nhất quán.

PowerShell tại thư mục dự án Windows:

```powershell
python -c "import sqlite3; s=sqlite3.connect('data/studio.db'); d=sqlite3.connect('studio-transfer.db'); s.backup(d); d.close(); s.close()"
scp studio-transfer.db root@160.187.1.213:/root/studio-transfer.db
scp -r data/assets root@160.187.1.213:/root/studio-assets
```

Đổi IP/user theo VPS thực tế nếu khác. Snapshot chứa API keys đã lưu, chỉ chuyển qua SSH vào VPS của bạn, không commit hoặc chia sẻ công khai. Ảnh nằm dưới `data/assets` bao gồm thư viện trang phục và các ảnh tham chiếu của dự án.

Trên VPS, **chỉ import vào lần đầu chưa có dữ liệu VPS cần giữ**. Nếu đã có dữ liệu mới, sao lưu trước và lập kế hoạch merge thay vì ghi đè:

```bash
sudo systemctl stop hinton-studio
# Sao lưu mọi data/ hiện có trước khi thay database.
sudo cp /root/studio-transfer.db /opt/hinton-studio/data/studio.db
sudo cp -a /root/studio-assets/. /opt/hinton-studio/data/assets/
sudo chown -R hintonstudio:hintonstudio /opt/hinton-studio/data
sudo chmod 700 /opt/hinton-studio/data
sudo systemctl start hinton-studio
```

Nếu có database cũ và các file `studio.db-wal`/`studio.db-shm`, không ghép snapshot mới với WAL cũ: di chuyển toàn bộ bộ database cũ vào thư mục backup riêng trong khi app dừng. Nhập API key lại trong Cài đặt nếu bạn chọn database mới hoàn toàn.

## 7. Cập nhật các lần sau qua main

Đợi job tạo ảnh/video hiện tại xong trước khi restart. Backup SQLite bằng backup API và `data/assets` định kỳ ra nơi riêng; Git không phải backup dữ liệu.

Từ `/opt/hinton-studio`, chạy `bash deploy/update.sh` dưới user sở hữu checkout, có quyền sudo restart service. Script fetch main bằng `pull --ff-only`, cài dependency, build riêng `.next-candidate`, chỉ thay build sau khi thành công. Không dùng `git reset --hard`. Nếu chỉ dùng root quản trị, chạy checkout bằng `sudo -u hintonstudio` và chạy lệnh systemctl riêng.

Nếu build lỗi: app hiện tại vẫn giữ build cũ. Nếu sau restart lỗi: xem log, dừng service, chuyển build `.next-backup-TIMESTAMP` về `.next`, đảm bảo dependency/commit tương ứng rồi start lại. Chạy `git log -5 --oneline` để xác định commit cần quay lại; không xóa `data/`.

```bash
sudo journalctl -u hinton-studio -n 100 --no-pager
sudo nginx -t
df -h
```

Backup builds chứa dung lượng lớn; chỉ xóa backup cũ sau khi đã xác nhận bản mới ổn định.

## 8. Ảnh công khai cho IOOAI/PiAPI

Deploy web **không tự biến ảnh thành URL mà nhà cung cấp tải được**: đường dẫn studio đang có Basic Auth. Không tắt bảo vệ toàn studio hoặc công khai Settings để lấy ảnh.

Dùng kho ảnh riêng (R2/S3/hosting) hoặc endpoint media ký URL có thời hạn. Prefix công khai ảnh phải tách khỏi API quản trị; chỉ ảnh cụ thể được cấp quyền, không directory listing. IOOAI cần URL HTTPS trực tiếp; PiAPI cũng cần URL có thể tải được. Hiện dự án chưa tích hợp bucket hoặc endpoint ký URL; phải cấu hình bước đó trước khi gửi ảnh local tới hai dịch vụ.

## Nguồn cấu hình

- Next.js basePath: https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
- Node.js runtime: https://nodejs.org/
- Node SQLite: https://nodejs.org/api/sqlite.html
