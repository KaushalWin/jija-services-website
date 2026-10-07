#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$(mktemp -d "$repo_root/.dist-build.XXXXXX")"

cleanup() {
  rm -rf "$build_dir"
}
trap cleanup EXIT

install -m 0644 "$repo_root/index.html" "$build_dir/index.html"
install -m 0644 "$repo_root/app.js" "$build_dir/app.js"
install -m 0644 "$repo_root/styles.css" "$build_dir/styles.css"
install -m 0644 "$repo_root/reviews.js" "$build_dir/reviews.js"
install -m 0644 "$repo_root/reviews.css" "$build_dir/reviews.css"
mkdir -p "$build_dir/admin"
install -m 0644 "$repo_root/admin/index.html" "$build_dir/admin/index.html"
install -m 0644 "$repo_root/admin/admin.js" "$build_dir/admin/admin.js"
install -m 0644 "$repo_root/admin/admin.css" "$build_dir/admin/admin.css"
install -m 0644 "$repo_root/robots.txt" "$build_dir/robots.txt"
install -m 0644 "$repo_root/sitemap.xml" "$build_dir/sitemap.xml"
cp -R "$repo_root/assets" "$build_dir/assets"

# Retain source artwork for recovery; publish only the current price-free posters.
for retired_poster in festival-summer-original.jpg hot-cups-original.jpg business-original.jpg festival-sale.jpg; do
  rm -f "$build_dir/assets/promotions/$retired_poster"
done

mkdir -p "$build_dir/pilot-2"
install -m 0644 "$repo_root/pilot-2/index.html" "$build_dir/pilot-2/index.html"

rm -rf "$repo_root/dist"
mv "$build_dir" "$repo_root/dist"
trap - EXIT
