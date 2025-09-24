Ringkasan Tanya–Jawab Anda
1. Pertanyaan:

Pesan di VS Code saat commit → “stage changes before commit?”
Jawaban:
Itu peringatan kalau belum ada file yang di-stage.

Yes → otomatis stage semua file lalu commit.

Always → selalu otomatis stage.

Never → harus stage manual.

Cancel → batal.
👉 Disarankan belajar dengan Yes atau manual pakai git add . agar paham alur Git.

2. Pertanyaan:

Langkah upload project ke GitHub untuk pertama kali?
Jawaban (alur singkat):

git init → inisialisasi repo lokal.

git remote add origin URL → hubungkan ke GitHub.

git add . → stage semua file.

git commit -m "First commit" → commit.

git branch -M main → pastikan branch utama main.

git push -u origin main → upload ke GitHub.

3. Pertanyaan:

Apakah nama repo lokal harus sama dengan nama repo GitHub?
Jawaban:
Tidak harus.

Nama folder lokal boleh beda dengan repo GitHub.

Yang penting URL remote (origin) benar.

Kalau repo GitHub diubah namanya, tinggal update dengan git remote set-url origin URL-baru.

4. Pertanyaan:

Apa itu .gitignore?
Jawaban:
File khusus untuk memberi tahu Git agar tidak melacak file/folder tertentu (misalnya node_modules/, vendor/, .env, *.log).
Gunanya supaya repo bersih dan tidak terlalu besar.

5. Pertanyaan:

Apakah .gitignore harus dicentang?
Jawaban:
Tidak wajib.

Kalau dicentang → otomatis dibuatkan file .gitignore.

Kalau tidak dicentang → semua file di-track, bisa bikin repo jadi berat.
👉 Rekomendasi: centang kalau project besar (Laravel, Node.js, React, dll).

⚡ Jadi garis besar:

.gitignore = opsional tapi sebaiknya dipakai.

Nama repo lokal ≠ harus sama dengan GitHub.

Alur upload: git init → git add . → git commit → git push.

Commit di VS Code bisa otomatis stage atau manual.