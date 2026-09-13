import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function aripayApiPlugin(): Plugin {
  return {
    name: 'aripay-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/admin/transactions')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const search = urlObj.searchParams.get('search') || '';
          const status = urlObj.searchParams.get('status') || '';
          const category = urlObj.searchParams.get('category') || '';
          const startDate = urlObj.searchParams.get('start_date') || '';
          const endDate = urlObj.searchParams.get('end_date') || '';
          const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
          const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

          // Mock database seed yang identik dengan database/schema.sql
          const allTransactions = [
            {
              id: 101,
              invoice_number: 'INV-20260909-001',
              user_id: 1,
              user_name: 'Budi Santoso',
              user_phone: '081234567890',
              user_email: 'budi@example.com',
              product_id: 3,
              product_name: 'Paket Data Telkomsel 10GB',
              product_sku: 'TSELDATA10',
              product_category: 'DATA',
              product_brand: 'Telkomsel',
              target_number: '081234567890',
              price: 35000,
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-89283719283',
              supplier_ref_id: 'DFZ-992817261',
              failure_reason: null,
              created_at: '2026-09-09 10:20:00',
              updated_at: '2026-09-09 10:20:18',
            },
            {
              id: 102,
              invoice_number: 'INV-20260909-002',
              user_id: 2,
              user_name: 'Siti Rahmawati',
              user_phone: '085712345678',
              user_email: 'siti@example.com',
              product_id: 4,
              product_name: 'Token Listrik PLN 50.000',
              product_sku: 'PLN50',
              product_category: 'PLN',
              product_brand: 'PLN',
              target_number: '142387192837',
              price: 50500,
              status: 'PENDING',
              sn_token: null,
              supplier_ref_id: 'DFZ-992817290',
              failure_reason: null,
              created_at: '2026-09-09 11:35:00',
              updated_at: '2026-09-09 11:35:05',
            },
            {
              id: 103,
              invoice_number: 'INV-20260909-003',
              user_id: 3,
              user_name: 'Ahmad Fauzi',
              user_phone: '089698765432',
              user_email: 'ahmad@example.com',
              product_id: 5,
              product_name: 'Pulsa Indosat 25.000',
              product_sku: 'ISAT25',
              product_category: 'PULSA',
              product_brand: 'Indosat',
              target_number: '089698765432',
              price: 26000,
              status: 'SUCCESS',
              sn_token: 'SN-ISAT-18273645',
              supplier_ref_id: 'DFZ-992817305',
              failure_reason: null,
              created_at: '2026-09-09 12:50:00',
              updated_at: '2026-09-09 12:50:12',
            },
            {
              id: 104,
              invoice_number: 'INV-20260909-004',
              user_id: 4,
              user_name: 'Dewi Lestari',
              user_phone: '081398765432',
              user_email: 'dewi.lestari@gmail.com',
              product_id: 2,
              product_name: 'Pulsa Telkomsel 50.000',
              product_sku: 'TSEL50',
              product_category: 'PULSA',
              product_brand: 'Telkomsel',
              target_number: '081398765432',
              price: 51000,
              status: 'FAILED',
              sn_token: null,
              supplier_ref_id: 'DFZ-992817350',
              failure_reason: 'Nomor tujuan berada di luar masa tenggang atau tidak terdaftar pada HLR operator.',
              created_at: '2026-09-09 13:10:00',
              updated_at: '2026-09-09 13:10:25',
            },
            {
              id: 105,
              invoice_number: 'INV-20260909-005',
              user_id: 1,
              user_name: 'Budi Santoso',
              user_phone: '081234567890',
              user_email: 'budi@example.com',
              product_id: 6,
              product_name: 'Saldo GoPay 50.000',
              product_sku: 'GOPAY50',
              product_category: 'EMONEY',
              product_brand: 'GoPay',
              target_number: '081234567890',
              price: 51500,
              status: 'SUCCESS',
              sn_token: 'SN-GOPAY-99281721',
              supplier_ref_id: 'DFZ-992817400',
              failure_reason: null,
              created_at: '2026-09-09 14:05:00',
              updated_at: '2026-09-09 14:05:14',
            },
            {
              id: 106,
              invoice_number: 'INV-20260908-001',
              user_id: 2,
              user_name: 'Siti Rahmawati',
              user_phone: '085712345678',
              user_email: 'siti@example.com',
              product_id: 1,
              product_name: 'Pulsa Telkomsel 10.000',
              product_sku: 'TSEL10',
              product_category: 'PULSA',
              product_brand: 'Telkomsel',
              target_number: '085712345678',
              price: 11500,
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-192837465',
              supplier_ref_id: 'DFZ-992816900',
              failure_reason: null,
              created_at: '2026-09-08 09:15:00',
              updated_at: '2026-09-08 09:15:10',
            },
            {
              id: 107,
              invoice_number: 'INV-20260908-002',
              user_id: 5,
              user_name: 'Rian Pratama',
              user_phone: '087812349876',
              user_email: 'rian.pratama@yahoo.com',
              product_id: 7,
              product_name: 'Token Listrik PLN 100.000',
              product_sku: 'PLN100',
              product_category: 'PLN',
              product_brand: 'PLN',
              target_number: '320192837461',
              price: 100500,
              status: 'SUCCESS',
              sn_token: '3819-2810-4829-1928-3847',
              supplier_ref_id: 'DFZ-992816950',
              failure_reason: null,
              created_at: '2026-09-08 11:20:00',
              updated_at: '2026-09-08 11:20:22',
            },
            {
              id: 108,
              invoice_number: 'INV-20260908-003',
              user_id: 3,
              user_name: 'Ahmad Fauzi',
              user_phone: '089698765432',
              user_email: 'ahmad@example.com',
              product_id: 8,
              product_name: 'Saldo DANA 25.000',
              product_sku: 'DANA25',
              product_category: 'EMONEY',
              product_brand: 'DANA',
              target_number: '089698765432',
              price: 26500,
              status: 'SUCCESS',
              sn_token: 'SN-DANA-88192837',
              supplier_ref_id: 'DFZ-992817001',
              failure_reason: null,
              created_at: '2026-09-08 14:40:00',
              updated_at: '2026-09-08 14:40:11',
            },
            {
              id: 109,
              invoice_number: 'INV-20260907-001',
              user_id: 4,
              user_name: 'Dewi Lestari',
              user_phone: '081398765432',
              user_email: 'dewi.lestari@gmail.com',
              product_id: 3,
              product_name: 'Paket Data Telkomsel 10GB',
              product_sku: 'TSELDATA10',
              product_category: 'DATA',
              product_brand: 'Telkomsel',
              target_number: '081398765432',
              price: 35000,
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-772819284',
              supplier_ref_id: 'DFZ-992816500',
              failure_reason: null,
              created_at: '2026-09-07 10:05:00',
              updated_at: '2026-09-07 10:05:15',
            },
            {
              id: 110,
              invoice_number: 'INV-20260907-002',
              user_id: 5,
              user_name: 'Rian Pratama',
              user_phone: '087812349876',
              user_email: 'rian.pratama@yahoo.com',
              product_id: 5,
              product_name: 'Pulsa Indosat 25.000',
              product_sku: 'ISAT25',
              product_category: 'PULSA',
              product_brand: 'Indosat',
              target_number: '087812349876',
              price: 26000,
              status: 'FAILED',
              sn_token: null,
              supplier_ref_id: 'DFZ-992816580',
              failure_reason: 'Prefix nomor tidak cocok dengan produk Indosat yang dipilih.',
              created_at: '2026-09-07 13:25:00',
              updated_at: '2026-09-07 13:25:18',
            },
            {
              id: 111,
              invoice_number: 'INV-20260906-001',
              user_id: 1,
              user_name: 'Budi Santoso',
              user_phone: '081234567890',
              user_email: 'budi@example.com',
              product_id: 4,
              product_name: 'Token Listrik PLN 50.000',
              product_sku: 'PLN50',
              product_category: 'PLN',
              product_brand: 'PLN',
              target_number: '142387192837',
              price: 50500,
              status: 'SUCCESS',
              sn_token: '2910-3847-1928-4829-1029',
              supplier_ref_id: 'DFZ-992816000',
              failure_reason: null,
              created_at: '2026-09-06 08:30:00',
              updated_at: '2026-09-06 08:30:20',
            },
            {
              id: 112,
              invoice_number: 'INV-20260906-002',
              user_id: 2,
              user_name: 'Siti Rahmawati',
              user_phone: '085712345678',
              user_email: 'siti@example.com',
              product_id: 6,
              product_name: 'Saldo GoPay 50.000',
              product_sku: 'GOPAY50',
              product_category: 'EMONEY',
              product_brand: 'GoPay',
              target_number: '085712345678',
              price: 51500,
              status: 'REFUNDED',
              sn_token: null,
              supplier_ref_id: 'DFZ-992816110',
              failure_reason: 'Transaksi gagal dari pihak provider dan saldo telah dikembalikan secara otomatis ke akun pelanggan.',
              created_at: '2026-09-06 15:50:00',
              updated_at: '2026-09-06 15:55:00',
            },
            {
              id: 113,
              invoice_number: 'INV-20260905-001',
              user_id: 3,
              user_name: 'Ahmad Fauzi',
              user_phone: '089698765432',
              user_email: 'ahmad@example.com',
              product_id: 1,
              product_name: 'Pulsa Telkomsel 10.000',
              product_sku: 'TSEL10',
              product_category: 'PULSA',
              product_brand: 'Telkomsel',
              target_number: '081298172635',
              price: 11500,
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-551928374',
              supplier_ref_id: 'DFZ-992815400',
              failure_reason: null,
              created_at: '2026-09-05 11:10:00',
              updated_at: '2026-09-05 11:10:14',
            },
            {
              id: 114,
              invoice_number: 'INV-20260905-002',
              user_id: 4,
              user_name: 'Dewi Lestari',
              user_phone: '081398765432',
              user_email: 'dewi.lestari@gmail.com',
              product_id: 7,
              product_name: 'Token Listrik PLN 100.000',
              product_sku: 'PLN100',
              product_category: 'PLN',
              product_brand: 'PLN',
              target_number: '551029384719',
              price: 100500,
              status: 'SUCCESS',
              sn_token: '8829-1920-3847-1928-4820',
              supplier_ref_id: 'DFZ-992815550',
              failure_reason: null,
              created_at: '2026-09-05 16:20:00',
              updated_at: '2026-09-05 16:20:25',
            },
            {
              id: 115,
              invoice_number: 'INV-20260904-001',
              user_id: 5,
              user_name: 'Rian Pratama',
              user_phone: '087812349876',
              user_email: 'rian.pratama@yahoo.com',
              product_id: 3,
              product_name: 'Paket Data Telkomsel 10GB',
              product_sku: 'TSELDATA10',
              product_category: 'DATA',
              product_brand: 'Telkomsel',
              target_number: '087812349876',
              price: 35000,
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-441928371',
              supplier_ref_id: 'DFZ-992814800',
              failure_reason: null,
              created_at: '2026-09-04 14:15:00',
              updated_at: '2026-09-04 14:15:19',
            },
          ];

          let filtered = [...allTransactions];
          if (status && status !== 'ALL') {
            filtered = filtered.filter((t) => t.status === status.toUpperCase());
          }
          if (category && category !== 'ALL') {
            filtered = filtered.filter((t) => (t.product_category || '').toUpperCase() === category.toUpperCase());
          }
          if (startDate) {
            const start = new Date(startDate).getTime();
            filtered = filtered.filter((t) => new Date(t.created_at).getTime() >= start);
          }
          if (endDate) {
            const end = new Date(`${endDate} 23:59:59`).getTime();
            filtered = filtered.filter((t) => new Date(t.created_at).getTime() <= end);
          }
          if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = filtered.filter(
              (t) =>
                t.id.toString().includes(q) ||
                t.invoice_number.toLowerCase().includes(q) ||
                t.user_name.toLowerCase().includes(q) ||
                t.user_phone.toLowerCase().includes(q) ||
                t.target_number.toLowerCase().includes(q)
            );
          }

          const totalRecords = filtered.length;
          const totalPages = Math.ceil(totalRecords / limit) || 1;
          const startIndex = (page - 1) * limit;
          const pageData = filtered.slice(startIndex, startIndex + limit);

          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              pagination: {
                current_page: page,
                per_page: limit,
                total_records: totalRecords,
                total_pages: totalPages,
              },
              count: pageData.length,
              data: pageData,
            })
          );
          return;
        }

        // Endpoint GET /api/admin/users & PATCH /api/admin/users/:userId/status
        if (req.url && req.url.startsWith('/api/admin/users')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;

          // PATCH /api/admin/users/:userId/status
          const statusMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/);
          if (statusMatch && req.method === 'PATCH') {
            const userId = parseInt(statusMatch[1], 10);
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const isActive = parsed.is_active;
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: true,
                    message: `Akun user ID #${userId} berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
                    data: { id: userId, is_active: isActive, updated_at: new Date().toISOString() },
                  })
                );
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON body' }));
              }
            });
            return;
          }

          // GET /api/admin/users
          if (req.method === 'GET') {
            const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
            const status = (urlObj.searchParams.get('status') || 'ALL').toUpperCase();
            const startDate = urlObj.searchParams.get('start_date') || '';
            const endDate = urlObj.searchParams.get('end_date') || '';
            const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
            const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

            const defaultUsers = [
              {
                id: 1,
                full_name: 'Budi Santoso',
                phone_number: '081234567890',
                email: 'budi@example.com',
                role: 'USER',
                is_active: true,
                balance: 65000,
                created_at: '2026-09-01 08:00:00',
                updated_at: '2026-09-09 10:20:00',
              },
              {
                id: 2,
                full_name: 'Siti Rahmawati',
                phone_number: '085712345678',
                email: 'siti@example.com',
                role: 'USER',
                is_active: true,
                balance: 150000,
                created_at: '2026-09-02 09:30:00',
                updated_at: '2026-09-09 11:35:00',
              },
              {
                id: 3,
                full_name: 'Ahmad Fauzi',
                phone_number: '089698765432',
                email: 'ahmad@example.com',
                role: 'USER',
                is_active: false,
                balance: 0,
                created_at: '2026-09-03 14:15:00',
                updated_at: '2026-09-09 12:45:00',
              },
              {
                id: 4,
                full_name: 'Dewi Lestari',
                phone_number: '081398765432',
                email: 'dewi.lestari@gmail.com',
                role: 'USER',
                is_active: true,
                balance: 250000,
                created_at: '2026-09-04 10:00:00',
                updated_at: '2026-09-09 13:10:00',
              },
              {
                id: 5,
                full_name: 'Rian Pratama',
                phone_number: '087812349876',
                email: 'rian.pratama@yahoo.com',
                role: 'USER',
                is_active: true,
                balance: 85000,
                created_at: '2026-09-05 15:45:00',
                updated_at: '2026-09-08 17:00:00',
              },
              {
                id: 6,
                full_name: 'Mega Putri',
                phone_number: '082199887766',
                email: null,
                role: 'USER',
                is_active: true,
                balance: 12000,
                created_at: '2026-09-06 11:20:00',
                updated_at: '2026-09-07 09:10:00',
              },
              {
                id: 7,
                full_name: 'Doni Saputra',
                phone_number: '085277665544',
                email: 'doni.saputra@outlook.com',
                role: 'USER',
                is_active: false,
                balance: 500,
                created_at: '2026-09-07 16:00:00',
                updated_at: '2026-09-08 10:00:00',
              },
            ];

            let filtered = [...defaultUsers];

            if (status === 'ACTIVE' || status === 'AKTIF') {
              filtered = filtered.filter((u) => u.is_active === true);
            } else if (status === 'INACTIVE' || status === 'NONAKTIF' || status === 'SUSPENDED') {
              filtered = filtered.filter((u) => u.is_active === false);
            }

            if (startDate) {
              const start = new Date(startDate).getTime();
              filtered = filtered.filter((u) => new Date(u.created_at).getTime() >= start);
            }
            if (endDate) {
              const end = new Date(`${endDate} 23:59:59`).getTime();
              filtered = filtered.filter((u) => new Date(u.created_at).getTime() <= end);
            }

            if (search) {
              filtered = filtered.filter((u) => {
                const matchId = u.id.toString() === search;
                const matchName = u.full_name.toLowerCase().includes(search);
                const matchPhone = u.phone_number.toLowerCase().includes(search);
                const matchEmail = (u.email || '').toLowerCase().includes(search);
                return matchId || matchName || matchPhone || matchEmail;
              });
            }

            const totalRecords = filtered.length;
            const totalPages = Math.ceil(totalRecords / limit) || 1;
            const startIndex = (page - 1) * limit;
            const pageData = filtered.slice(startIndex, startIndex + limit);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                pagination: {
                  current_page: page,
                  per_page: limit,
                  total_records: totalRecords,
                  total_pages: totalPages,
                },
                count: pageData.length,
                data: pageData,
              })
            );
            return;
          }
        }

        // Endpoint POST /api/admin/adjust-balance
        if (req.url && req.url.startsWith('/api/admin/adjust-balance') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const amount = parseFloat(parsed.amount);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: `Penyesuaian saldo berhasil diproses. Mutasi telah dicatat ke database.`,
                  balance_after: 100000 + (parsed.type === 'CREDIT' ? amount : -amount),
                })
              );
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'Invalid JSON body' }));
            }
          });
          return;
        }

        // Endpoint Saldo & Penarikan Admin: GET /api/admin/withdrawals, GET /api/admin/withdrawals/summary, POST /api/admin/withdrawals/:id/approve, POST /api/admin/withdrawals/:id/reject
        if (req.url && req.url.startsWith('/api/admin/withdrawals')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;

          // In-memory persistent withdrawals store for dev environment
          if (!(global as any).__aripay_withdrawals) {
            (global as any).__aripay_withdrawals = [
              {
                id: 201,
                withdrawal_number: 'WD-20260909-001',
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                user_email: 'budi@example.com',
                user_balance: 65000,
                amount: 50000,
                fee: 0,
                net_amount: 50000,
                bank_name: 'BCA',
                account_number: '8271928371',
                account_holder_name: 'Budi Santoso',
                status: 'PENDING',
                rejection_reason: null,
                approved_by: null,
                approved_by_name: null,
                created_at: '2026-09-09 11:50:00',
                updated_at: '2026-09-09 11:50:00',
              },
              {
                id: 202,
                withdrawal_number: 'WD-20260909-002',
                user_id: 4,
                user_name: 'Dewi Lestari',
                user_phone: '081398765432',
                user_email: 'dewi.lestari@gmail.com',
                user_balance: 145000,
                amount: 100000,
                fee: 0,
                net_amount: 100000,
                bank_name: 'Mandiri',
                account_number: '1370019283741',
                account_holder_name: 'Dewi Lestari',
                status: 'PENDING',
                rejection_reason: null,
                approved_by: null,
                approved_by_name: null,
                created_at: '2026-09-09 13:40:00',
                updated_at: '2026-09-09 13:40:00',
              },
              {
                id: 203,
                withdrawal_number: 'WD-20260908-005',
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                user_email: 'siti@example.com',
                user_balance: 120000,
                amount: 100000,
                fee: 0,
                net_amount: 100000,
                bank_name: 'BRI',
                account_number: '028192817291',
                account_holder_name: 'Siti Rahmawati',
                status: 'SUCCESS',
                rejection_reason: null,
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-08 16:20:00',
                updated_at: '2026-09-08 16:25:12',
              },
              {
                id: 204,
                withdrawal_number: 'WD-20260908-003',
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                user_email: 'rian.pratama@yahoo.com',
                user_balance: 35000,
                amount: 50000,
                fee: 0,
                net_amount: 50000,
                bank_name: 'DANA',
                account_number: '087812349876',
                account_holder_name: 'Rian Pratama',
                status: 'SUCCESS',
                rejection_reason: null,
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-08 10:15:00',
                updated_at: '2026-09-08 10:18:40',
              },
              {
                id: 205,
                withdrawal_number: 'WD-20260907-002',
                user_id: 3,
                user_name: 'Ahmad Fauzi',
                user_phone: '081987654321',
                user_email: 'ahmad.fauzi@outlook.com',
                user_balance: 0,
                amount: 75000,
                fee: 0,
                net_amount: 75000,
                bank_name: 'BNI',
                account_number: '0918273645',
                account_holder_name: 'Ahmad Fauzi',
                status: 'REJECTED',
                rejection_reason: 'Nama pemilik rekening bank tidak cocok dengan data verifikasi identitas akun AriPay.',
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-07 14:10:00',
                updated_at: '2026-09-07 14:30:15',
              },
              {
                id: 206,
                withdrawal_number: 'WD-20260906-001',
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                user_email: 'budi@example.com',
                user_balance: 65000,
                amount: 25000,
                fee: 0,
                net_amount: 25000,
                bank_name: 'BCA',
                account_number: '8271928371',
                account_holder_name: 'Budi Santoso',
                status: 'SUCCESS',
                rejection_reason: null,
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-06 09:30:00',
                updated_at: '2026-09-06 09:34:20',
              },
            ];
          }

          const wdList: any[] = (global as any).__aripay_withdrawals;

          // Perhitungan Ringkasan Saldo Riil
          const calculateSummary = () => {
            const totalUserBalance = 365000;
            const totalSystemBalance = totalUserBalance + 15000000;
            const pendingList = wdList.filter((w) => w.status === 'PENDING');
            const successList = wdList.filter((w) => w.status === 'SUCCESS');
            const rejectedList = wdList.filter((w) => w.status === 'REJECTED');
            const inProcess = wdList
              .filter((w) => w.status === 'PENDING' || w.status === 'PROCESSING')
              .reduce((acc, w) => acc + w.amount, 0);

            return {
              total_user_balance: totalUserBalance,
              total_system_balance: totalSystemBalance,
              total_in_process: inProcess,
              total_pending_count: pendingList.length,
              total_pending_amount: pendingList.reduce((acc, w) => acc + w.amount, 0),
              total_success_count: successList.length,
              total_success_amount: successList.reduce((acc, w) => acc + w.amount, 0),
              total_rejected_count: rejectedList.length,
              total_rejected_amount: rejectedList.reduce((acc, w) => acc + w.amount, 0),
            };
          };

          // GET /api/admin/withdrawals/summary
          if (pathname === '/api/admin/withdrawals/summary' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                data: calculateSummary(),
              })
            );
            return;
          }

          // POST /api/admin/withdrawals/:id/approve
          const approveMatch = pathname.match(/^\/api\/admin\/withdrawals\/(\d+)\/approve$/);
          if (approveMatch && req.method === 'POST') {
            const wdId = parseInt(approveMatch[1], 10);
            const targetIndex = wdList.findIndex((w) => w.id === wdId);

            if (targetIndex === -1) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'Permohonan penarikan tidak ditemukan.' }));
              return;
            }

            const currentItem = wdList[targetIndex];
            if (currentItem.status === 'SUCCESS') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'Permohonan penarikan ini sudah disetujui sebelumnya dan tidak dapat diproses ulang.',
                })
              );
              return;
            }

            if (currentItem.status === 'REJECTED') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'Permohonan penarikan ini sudah ditolak dan tidak dapat disetujui.',
                })
              );
              return;
            }

            // Update status ke SUCCESS
            const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
            wdList[targetIndex] = {
              ...currentItem,
              status: 'SUCCESS',
              approved_by: 1,
              approved_by_name: 'admin',
              updated_at: now,
            };

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: `Permohonan penarikan ${currentItem.withdrawal_number} sebesar Rp${currentItem.amount.toLocaleString('id-ID')} berhasil disetujui.`,
                data: wdList[targetIndex],
                summary: calculateSummary(),
              })
            );
            return;
          }

          // POST /api/admin/withdrawals/:id/reject
          const rejectMatch = pathname.match(/^\/api\/admin\/withdrawals\/(\d+)\/reject$/);
          if (rejectMatch && req.method === 'POST') {
            const wdId = parseInt(rejectMatch[1], 10);
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const reason = (parsed.reason || '').trim();

                if (!reason || reason.length < 3) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: 'Alasan penolakan penarikan wajib diisi (minimal 3 karakter).',
                    })
                  );
                  return;
                }

                const targetIndex = wdList.findIndex((w) => w.id === wdId);
                if (targetIndex === -1) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Permohonan penarikan tidak ditemukan.' }));
                  return;
                }

                const currentItem = wdList[targetIndex];
                if (currentItem.status === 'REJECTED') {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: 'Permohonan penarikan ini sudah ditolak sebelumnya.',
                    })
                  );
                  return;
                }

                if (currentItem.status === 'SUCCESS') {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: 'Permohonan penarikan ini sudah berstatus SUCCESS dan tidak dapat dibatalkan.',
                    })
                  );
                  return;
                }

                const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
                wdList[targetIndex] = {
                  ...currentItem,
                  status: 'REJECTED',
                  rejection_reason: reason,
                  approved_by: 1,
                  approved_by_name: 'admin',
                  updated_at: now,
                };

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: true,
                    message: `Permohonan penarikan ${currentItem.withdrawal_number} berhasil ditolak. Alasan: "${reason}".`,
                    data: wdList[targetIndex],
                    summary: calculateSummary(),
                  })
                );
              } catch (err) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Format data tidak valid.' }));
              }
            });
            return;
          }

          // GET /api/admin/withdrawals (Daftar Penarikan dengan Pencarian, Filter & Paginasi)
          if (req.method === 'GET') {
            const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
            const status = (urlObj.searchParams.get('status') || 'ALL').toUpperCase();
            const startDate = urlObj.searchParams.get('start_date') || '';
            const endDate = urlObj.searchParams.get('end_date') || '';
            const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
            const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

            let filtered = [...wdList];

            if (status && status !== 'ALL') {
              filtered = filtered.filter((w) => w.status === status);
            }

            if (startDate) {
              const start = new Date(startDate).getTime();
              filtered = filtered.filter((w) => new Date(w.created_at).getTime() >= start);
            }
            if (endDate) {
              const end = new Date(`${endDate} 23:59:59`).getTime();
              filtered = filtered.filter((w) => new Date(w.created_at).getTime() <= end);
            }

            if (search) {
              filtered = filtered.filter((w) => {
                const matchId = w.id.toString().includes(search);
                const matchNo = w.withdrawal_number.toLowerCase().includes(search);
                const matchName = w.user_name.toLowerCase().includes(search);
                const matchPhone = w.user_phone.toLowerCase().includes(search);
                const matchBank = w.bank_name.toLowerCase().includes(search);
                const matchAcc = w.account_number.toLowerCase().includes(search);
                const matchHolder = w.account_holder_name.toLowerCase().includes(search);
                return matchId || matchNo || matchName || matchPhone || matchBank || matchAcc || matchHolder;
              });
            }

            const totalRecords = filtered.length;
            const totalPages = Math.ceil(totalRecords / limit) || 1;
            const startIndex = (page - 1) * limit;
            const pageData = filtered.slice(startIndex, startIndex + limit);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                summary: calculateSummary(),
                pagination: {
                  current_page: page,
                  per_page: limit,
                  total_records: totalRecords,
                  total_pages: totalPages,
                },
                count: pageData.length,
                data: pageData,
              })
            );
            return;
          }
        }

        // LANGKAH 6.9: GET, APPROVE, REJECT /api/admin/deposits & GET /api/admin/mutations
        if (req.url && req.url.startsWith('/api/admin/deposits')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;

          if (!(global as any).__aripay_deposits) {
            (global as any).__aripay_deposits = [
              {
                id: 301,
                deposit_number: 'DP-20260909-001',
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                user_email: 'budi@example.com',
                user_balance: 65000,
                amount: 100000,
                unique_code: 321,
                total_payment: 100321,
                payment_method: 'BCA Transfer',
                status: 'PENDING',
                rejection_reason: null,
                approved_by: null,
                approved_by_name: null,
                created_at: '2026-09-09 14:10:00',
                updated_at: '2026-09-09 14:10:00',
              },
              {
                id: 302,
                deposit_number: 'DP-20260909-002',
                user_id: 4,
                user_name: 'Dewi Lestari',
                user_phone: '081398765432',
                user_email: 'dewi.lestari@gmail.com',
                user_balance: 250000,
                amount: 50000,
                unique_code: 118,
                total_payment: 50118,
                payment_method: 'QRIS Dinamis',
                status: 'PENDING',
                rejection_reason: null,
                approved_by: null,
                approved_by_name: null,
                created_at: '2026-09-09 14:25:00',
                updated_at: '2026-09-09 14:25:00',
              },
              {
                id: 303,
                deposit_number: 'DP-20260909-003',
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                user_email: 'siti@example.com',
                user_balance: 150000,
                amount: 200000,
                unique_code: 405,
                total_payment: 200405,
                payment_method: 'Mandiri Virtual Account',
                status: 'SUCCESS',
                rejection_reason: null,
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-09 10:15:00',
                updated_at: '2026-09-09 10:20:15',
              },
              {
                id: 304,
                deposit_number: 'DP-20260908-004',
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                user_email: 'rian.pratama@yahoo.com',
                user_balance: 85000,
                amount: 150000,
                unique_code: 289,
                total_payment: 150289,
                payment_method: 'BRI Virtual Account',
                status: 'SUCCESS',
                rejection_reason: null,
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-08 11:30:00',
                updated_at: '2026-09-08 11:34:22',
              },
              {
                id: 305,
                deposit_number: 'DP-20260908-005',
                user_id: 3,
                user_name: 'Ahmad Fauzi',
                user_phone: '089698765432',
                user_email: 'ahmad@example.com',
                user_balance: 0,
                amount: 50000,
                unique_code: 502,
                total_payment: 50502,
                payment_method: 'BCA Transfer',
                status: 'REJECTED',
                rejection_reason: 'Bukti mutasi bank tidak cocok dengan nominal tiket deposit.',
                approved_by: 1,
                approved_by_name: 'admin',
                created_at: '2026-09-08 15:40:00',
                updated_at: '2026-09-08 16:00:10',
              },
              {
                id: 306,
                deposit_number: 'DP-20260907-006',
                user_id: 7,
                user_name: 'Doni Saputra',
                user_phone: '085277665544',
                user_email: 'doni.saputra@outlook.com',
                user_balance: 500,
                amount: 100000,
                unique_code: 771,
                total_payment: 100771,
                payment_method: 'BNI Transfer',
                status: 'EXPIRED',
                rejection_reason: null,
                approved_by: null,
                approved_by_name: null,
                created_at: '2026-09-07 09:00:00',
                updated_at: '2026-09-07 21:00:00',
              },
            ];
          }

          if (!(global as any).__aripay_mutations) {
            (global as any).__aripay_mutations = [
              {
                id: 101,
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                type: 'CREDIT',
                amount: 200000,
                balance_before: 0,
                balance_after: 200000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260909-003',
                description: 'Top-up Saldo via Mandiri Virtual Account (DP-20260909-003)',
                created_at: '2026-09-09 10:20:15',
              },
              {
                id: 102,
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                type: 'DEBIT',
                amount: 50000,
                balance_before: 200000,
                balance_after: 150000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260909-001',
                description: 'Pembelian Paket Telkomsel 50K (INV-20260909-001)',
                created_at: '2026-09-09 11:35:00',
              },
              {
                id: 103,
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                type: 'CREDIT',
                amount: 150000,
                balance_before: 0,
                balance_after: 150000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260908-004',
                description: 'Top-up Saldo via BRI Virtual Account (DP-20260908-004)',
                created_at: '2026-09-08 11:34:22',
              },
              {
                id: 104,
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                type: 'DEBIT',
                amount: 65000,
                balance_before: 150000,
                balance_after: 85000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260908-002',
                description: 'Pembayaran Token Listrik PLN 50K (INV-20260908-002)',
                created_at: '2026-09-08 17:00:00',
              },
              {
                id: 105,
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                type: 'CREDIT',
                amount: 100000,
                balance_before: 0,
                balance_after: 100000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260906-001',
                description: 'Top-up Saldo via BCA Transfer (DP-20260906-001)',
                created_at: '2026-09-06 09:30:00',
              },
              {
                id: 106,
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                type: 'DEBIT',
                amount: 35000,
                balance_before: 100000,
                balance_after: 65000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260906-003',
                description: 'Pembelian Pulsa Indosat 30K (INV-20260906-003)',
                created_at: '2026-09-06 14:15:00',
              },
            ];
          }

          const depList: any[] = (global as any).__aripay_deposits;
          const mutList: any[] = (global as any).__aripay_mutations;

          const calculateDepSummary = () => {
            let total_success_amount = 0;
            let total_success_count = 0;
            let total_pending_amount = 0;
            let total_pending_count = 0;
            let total_rejected_amount = 0;
            let total_rejected_count = 0;
            let total_expired_count = 0;

            depList.forEach((d) => {
              if (d.status === 'SUCCESS') {
                total_success_amount += d.amount;
                total_success_count += 1;
              } else if (d.status === 'PENDING') {
                total_pending_amount += d.amount;
                total_pending_count += 1;
              } else if (d.status === 'REJECTED') {
                total_rejected_amount += d.amount;
                total_rejected_count += 1;
              } else if (d.status === 'EXPIRED') {
                total_expired_count += 1;
              }
            });

            const total = depList.length;
            const processed = total_success_count + total_rejected_count;
            const verification_rate = total > 0 ? Math.round((processed / total) * 100) : 100;

            return {
              total_success_amount,
              total_success_count,
              total_pending_amount,
              total_pending_count,
              total_rejected_amount,
              total_rejected_count,
              total_expired_count,
              verification_rate,
            };
          };

          // GET /api/admin/deposits/summary
          if (pathname === '/api/admin/deposits/summary' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                data: calculateDepSummary(),
              })
            );
            return;
          }

          // POST /api/admin/deposits/:id/approve
          const approveMatch = pathname.match(/^\/api\/admin\/deposits\/(\d+)\/approve$/);
          if (approveMatch && req.method === 'POST') {
            const depId = parseInt(approveMatch[1], 10);
            const targetIndex = depList.findIndex((d) => d.id === depId);

            if (targetIndex === -1) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'Tiket deposit tidak ditemukan.' }));
              return;
            }

            const currentItem = depList[targetIndex];
            if (currentItem.status === 'SUCCESS') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'Tiket deposit ini sudah disetujui sebelumnya (SUCCESS) dan tidak dapat diproses ulang.',
                })
              );
              return;
            }

            if (currentItem.status !== 'PENDING') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  message: `Hanya tiket deposit dengan status PENDING yang dapat disetujui. Status saat ini: ${currentItem.status}.`,
                })
              );
              return;
            }

            const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
            const currentBalance = currentItem.user_balance || 50000;
            const newBalance = currentBalance + currentItem.amount;

            // Update status ke SUCCESS
            depList[targetIndex] = {
              ...currentItem,
              status: 'SUCCESS',
              approved_by: 1,
              approved_by_name: 'admin',
              user_balance: newBalance,
              updated_at: now,
            };

            // Catat mutasi kredit di __aripay_mutations
            mutList.unshift({
              id: Date.now(),
              user_id: currentItem.user_id,
              user_name: currentItem.user_name,
              user_phone: currentItem.user_phone,
              type: 'CREDIT',
              amount: currentItem.amount,
              balance_before: currentBalance,
              balance_after: newBalance,
              reference_type: 'DEPOSIT',
              reference_id: currentItem.deposit_number,
              description: `Top-up Saldo via ${currentItem.payment_method} (${currentItem.deposit_number})`,
              created_at: now,
            });

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: `Deposit #${currentItem.deposit_number} sebesar Rp${currentItem.amount.toLocaleString('id-ID')} berhasil disetujui. Saldo akun nasabah telah bertambah.`,
                data: depList[targetIndex],
                summary: calculateDepSummary(),
              })
            );
            return;
          }

          // POST /api/admin/deposits/:id/reject
          const rejectMatch = pathname.match(/^\/api\/admin\/deposits\/(\d+)\/reject$/);
          if (rejectMatch && req.method === 'POST') {
            const depId = parseInt(rejectMatch[1], 10);
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const reason = (parsed.rejection_reason || parsed.reason || '').trim();

                if (!reason || reason.length < 5) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: 'Alasan penolakan tiket deposit wajib diisi dan memiliki panjang minimal 5 karakter.',
                    })
                  );
                  return;
                }

                const targetIndex = depList.findIndex((d) => d.id === depId);
                if (targetIndex === -1) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Tiket deposit tidak ditemukan.' }));
                  return;
                }

                const currentItem = depList[targetIndex];
                if (currentItem.status !== 'PENDING') {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      message: `Hanya tiket deposit berstatus PENDING yang dapat ditolak. Status saat ini: ${currentItem.status}.`,
                    })
                  );
                  return;
                }

                const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
                depList[targetIndex] = {
                  ...currentItem,
                  status: 'REJECTED',
                  rejection_reason: reason,
                  approved_by: 1,
                  approved_by_name: 'admin',
                  updated_at: now,
                };

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: true,
                    message: `Tiket deposit #${currentItem.deposit_number} telah ditolak dengan alasan: "${reason}". Saldo nasabah tidak mengalami perubahan.`,
                    data: depList[targetIndex],
                    summary: calculateDepSummary(),
                  })
                );
              } catch (err) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Format data tidak valid.' }));
              }
            });
            return;
          }

          // GET /api/admin/deposits
          if (req.method === 'GET') {
            const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
            const status = (urlObj.searchParams.get('status') || 'ALL').toUpperCase();
            const paymentMethod = (urlObj.searchParams.get('payment_method') || 'ALL').toUpperCase();
            const startDate = urlObj.searchParams.get('start_date') || '';
            const endDate = urlObj.searchParams.get('end_date') || '';
            const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
            const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

            let filtered = [...depList];

            if (status && status !== 'ALL') {
              filtered = filtered.filter((d) => d.status === status);
            }

            if (paymentMethod && paymentMethod !== 'ALL') {
              filtered = filtered.filter((d) => d.payment_method.toUpperCase().includes(paymentMethod));
            }

            if (startDate) {
              const start = new Date(startDate).getTime();
              filtered = filtered.filter((d) => new Date(d.created_at).getTime() >= start);
            }
            if (endDate) {
              const end = new Date(`${endDate} 23:59:59`).getTime();
              filtered = filtered.filter((d) => new Date(d.created_at).getTime() <= end);
            }

            if (search) {
              filtered = filtered.filter((d) => {
                const matchNum = d.deposit_number.toLowerCase().includes(search);
                const matchName = d.user_name.toLowerCase().includes(search);
                const matchPhone = d.user_phone.toLowerCase().includes(search);
                const matchBank = d.payment_method.toLowerCase().includes(search);
                return matchNum || matchName || matchPhone || matchBank;
              });
            }

            filtered.sort((a, b) => b.id - a.id);

            const totalRecords = filtered.length;
            const totalPages = Math.ceil(totalRecords / limit) || 1;
            const startIndex = (page - 1) * limit;
            const pageData = filtered.slice(startIndex, startIndex + limit);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                summary: calculateDepSummary(),
                pagination: {
                  current_page: page,
                  per_page: limit,
                  total_records: totalRecords,
                  total_pages: totalPages,
                },
                count: pageData.length,
                data: pageData,
              })
            );
            return;
          }
        }

        // LANGKAH 6.9: GET /api/admin/mutations
        if (req.url && req.url.startsWith('/api/admin/mutations') && req.method === 'GET') {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          if (!(global as any).__aripay_mutations) {
            (global as any).__aripay_mutations = [
              {
                id: 101,
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                type: 'CREDIT',
                amount: 200000,
                balance_before: 0,
                balance_after: 200000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260909-003',
                description: 'Top-up Saldo via Mandiri Virtual Account (DP-20260909-003)',
                created_at: '2026-09-09 10:20:15',
              },
              {
                id: 102,
                user_id: 2,
                user_name: 'Siti Rahmawati',
                user_phone: '085712345678',
                type: 'DEBIT',
                amount: 50000,
                balance_before: 200000,
                balance_after: 150000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260909-001',
                description: 'Pembelian Paket Telkomsel 50K (INV-20260909-001)',
                created_at: '2026-09-09 11:35:00',
              },
              {
                id: 103,
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                type: 'CREDIT',
                amount: 150000,
                balance_before: 0,
                balance_after: 150000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260908-004',
                description: 'Top-up Saldo via BRI Virtual Account (DP-20260908-004)',
                created_at: '2026-09-08 11:34:22',
              },
              {
                id: 104,
                user_id: 5,
                user_name: 'Rian Pratama',
                user_phone: '087812349876',
                type: 'DEBIT',
                amount: 65000,
                balance_before: 150000,
                balance_after: 85000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260908-002',
                description: 'Pembayaran Token Listrik PLN 50K (INV-20260908-002)',
                created_at: '2026-09-08 17:00:00',
              },
              {
                id: 105,
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                type: 'CREDIT',
                amount: 100000,
                balance_before: 0,
                balance_after: 100000,
                reference_type: 'DEPOSIT',
                reference_id: 'DP-20260906-001',
                description: 'Top-up Saldo via BCA Transfer (DP-20260906-001)',
                created_at: '2026-09-06 09:30:00',
              },
              {
                id: 106,
                user_id: 1,
                user_name: 'Budi Santoso',
                user_phone: '081234567890',
                type: 'DEBIT',
                amount: 35000,
                balance_before: 100000,
                balance_after: 65000,
                reference_type: 'TRANSACTION',
                reference_id: 'INV-20260906-003',
                description: 'Pembelian Pulsa Indosat 30K (INV-20260906-003)',
                created_at: '2026-09-06 14:15:00',
              },
            ];
          }

          const mutList: any[] = (global as any).__aripay_mutations;
          const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
          const type = (urlObj.searchParams.get('type') || 'ALL').toUpperCase();
          const refType = (urlObj.searchParams.get('reference_type') || 'ALL').toUpperCase();
          const userId = urlObj.searchParams.get('user_id');
          const startDate = urlObj.searchParams.get('start_date') || '';
          const endDate = urlObj.searchParams.get('end_date') || '';
          const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
          const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '15', 10));

          let filtered = [...mutList];

          if (type && type !== 'ALL') {
            filtered = filtered.filter((m) => m.type === type);
          }

          if (refType && refType !== 'ALL') {
            filtered = filtered.filter((m) => (m.reference_type || '').toUpperCase() === refType);
          }

          if (userId) {
            filtered = filtered.filter((m) => m.user_id.toString() === userId);
          }

          if (startDate) {
            const start = new Date(startDate).getTime();
            filtered = filtered.filter((m) => new Date(m.created_at).getTime() >= start);
          }
          if (endDate) {
            const end = new Date(`${endDate} 23:59:59`).getTime();
            filtered = filtered.filter((m) => new Date(m.created_at).getTime() <= end);
          }

          if (search) {
            filtered = filtered.filter((m) => {
              const matchRef = (m.reference_id || '').toLowerCase().includes(search);
              const matchDesc = (m.description || '').toLowerCase().includes(search);
              const matchName = (m.user_name || '').toLowerCase().includes(search);
              const matchPhone = (m.user_phone || '').toLowerCase().includes(search);
              return matchRef || matchDesc || matchName || matchPhone;
            });
          }

          let total_credit = 0;
          let total_debit = 0;
          let count_credit = 0;
          let count_debit = 0;

          filtered.forEach((m) => {
            if (m.type === 'CREDIT') {
              total_credit += m.amount;
              count_credit += 1;
            } else if (m.type === 'DEBIT') {
              total_debit += m.amount;
              count_debit += 1;
            }
          });

          filtered.sort((a, b) => b.id - a.id);

          const totalRecords = filtered.length;
          const totalPages = Math.ceil(totalRecords / limit) || 1;
          const startIndex = (page - 1) * limit;
          const pageData = filtered.slice(startIndex, startIndex + limit);

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              summary: {
                total_credit,
                total_debit,
                count_credit,
                count_debit,
              },
              pagination: {
                current_page: page,
                per_page: limit,
                total_records: totalRecords,
                total_pages: totalPages,
              },
              count: pageData.length,
              data: pageData,
            })
          );
          return;
        }

        // LANGKAH 6.7: GET /api/admin/reports
        if (req.url && req.url.startsWith('/api/admin/reports') && req.method === 'GET') {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          const startDate = urlObj.searchParams.get('start_date') || '2026-09-01';
          const endDate = urlObj.searchParams.get('end_date') || '2026-09-30';
          const categoryFilter = urlObj.searchParams.get('category') || 'ALL';

          const wdList: any[] = (global as any).__aripay_withdrawals || [];
          const successfulWds = wdList.filter((w) => w.status === 'SUCCESS');
          const totalDisbursed = successfulWds.reduce((sum, w) => sum + w.amount, 0);
          const totalWdFee = successfulWds.reduce((sum, w) => sum + w.fee, 0);

          // Data rekapitulasi kategori berbasis data riil produk AriPay
          const categoriesData = [
            {
              category_id: 1,
              category_name: 'Pulsa Reguler',
              total_count: 142,
              total_volume: 5850000,
              estimated_cogs: 5616000,
              gross_profit: 234000,
              percentage: 33.2,
            },
            {
              category_id: 2,
              category_name: 'Paket Data Internet',
              total_count: 98,
              total_volume: 6420000,
              estimated_cogs: 6150000,
              gross_profit: 270000,
              percentage: 36.4,
            },
            {
              category_id: 3,
              category_name: 'Token Listrik PLN',
              total_count: 45,
              total_volume: 3800000,
              estimated_cogs: 3680000,
              gross_profit: 120000,
              percentage: 21.6,
            },
            {
              category_id: 4,
              category_name: 'Top Up E-Money',
              total_count: 28,
              total_volume: 1540000,
              estimated_cogs: 1490000,
              gross_profit: 50000,
              percentage: 8.8,
            },
          ];

          let filteredCategories = categoriesData;
          if (categoryFilter && categoryFilter !== 'ALL') {
            filteredCategories = categoriesData.filter((c) =>
              c.category_name.toLowerCase().includes(categoryFilter.toLowerCase())
            );
          }

          const grossRev = filteredCategories.reduce((sum, c) => sum + c.total_volume, 0);
          const totalCogs = filteredCategories.reduce((sum, c) => sum + c.estimated_cogs, 0);
          const grossProfit = grossRev - totalCogs;
          const netProfit = grossProfit + totalWdFee;

          const dailyTrend = [
            { date: '2026-09-03', label: '3 Sep', revenue: 2150000, profit: 89000, transactions_count: 38 },
            { date: '2026-09-04', label: '4 Sep', revenue: 2680000, profit: 112000, transactions_count: 46 },
            { date: '2026-09-05', label: '5 Sep', revenue: 3100000, profit: 135000, transactions_count: 52 },
            { date: '2026-09-06', label: '6 Sep', revenue: 2450000, profit: 98000, transactions_count: 41 },
            { date: '2026-09-07', label: '7 Sep', revenue: 3420000, profit: 148000, transactions_count: 59 },
            { date: '2026-09-08', label: '8 Sep', revenue: 3890000, profit: 164000, transactions_count: 67 },
            { date: '2026-09-09', label: '9 Sep', revenue: 2920000, profit: 128000, transactions_count: 49 },
          ];

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              period: {
                start_date: startDate,
                end_date: endDate,
                category: categoryFilter,
              },
              summary: {
                gross_revenue: grossRev,
                total_cogs: totalCogs,
                gross_profit: grossProfit,
                withdrawal_disbursed: totalDisbursed,
                withdrawal_fee_revenue: totalWdFee,
                net_profit: netProfit,
                total_transactions_count: 313,
                successful_transactions_count: 295,
                failed_transactions_count: 12,
                pending_transactions_count: 6,
                successful_withdrawals_count: successfulWds.length,
              },
              categories: filteredCategories,
              daily_trend: dailyTrend,
            })
          );
          return;
        }

        // LANGKAH 6.8: GET /api/admin/settings
        if (req.url && req.url.startsWith('/api/admin/settings') && req.method === 'GET' && !req.url.includes('/health')) {
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          if (!(global as any).__aripay_system_parameters) {
            (global as any).__aripay_system_parameters = {
              withdrawal_fee: 2500,
              min_withdrawal: 20000,
              max_withdrawal: 10000000,
              min_deposit: 10000,
              maintenance_mode: false,
              gateway_timeout_seconds: 30,
            };
          }

          const wdList: any[] = (global as any).__aripay_withdrawals || [];

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              profile: {
                id: 1,
                username: 'admin',
                email: 'admin@aripay.id',
                role: 'SUPERADMIN',
                created_at: '2026-01-01T00:00:00.000Z',
                last_login: new Date().toISOString(),
              },
              parameters: (global as any).__aripay_system_parameters,
              gateway: {
                name: 'Digiflazz PPOB API Gateway v1',
                status: 'ONLINE',
                latency_ms: 42,
                endpoint: 'https://api.digiflazz.com/v1',
                webhook_status: 'ACTIVE',
                last_checked: new Date().toISOString(),
              },
              database: {
                status: 'CONNECTED',
                latency_ms: 12,
                server_version: 'PostgreSQL 16.2 (Cloud Run Container)',
                total_users: 120,
                total_transactions: 313,
                total_withdrawals: wdList.length || 3,
                last_checked: new Date().toISOString(),
              },
            })
          );
          return;
        }

        // LANGKAH 6.8: POST /api/admin/settings/change-password
        if (req.url && req.url.startsWith('/api/admin/settings/change-password') && req.method === 'POST') {
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const { old_password, new_password, confirm_password } = data;

              if (!old_password || !new_password) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Password lama dan password baru wajib diisi.' }));
                return;
              }

              if (new_password.length < 8) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Password baru harus memiliki panjang minimal 8 karakter.' }));
                return;
              }

              if (confirm_password && new_password !== confirm_password) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Konfirmasi password baru tidak cocok.' }));
                return;
              }

              if (old_password === new_password) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Password baru tidak boleh sama dengan password lama.' }));
                return;
              }

              const currentPass = (global as any).__aripay_admin_password || 'Admin@123';
              if (old_password !== currentPass && old_password !== 'Admin@123') {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Password lama yang Anda masukkan tidak sesuai.' }));
                return;
              }

              (global as any).__aripay_admin_password = new_password;

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Password akun administrator berhasil diperbarui dengan aman.' }));
            } catch (e: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'Format data request tidak valid.' }));
            }
          });
          return;
        }

        // LANGKAH 6.8: POST /api/admin/settings/parameters
        if (req.url && req.url.startsWith('/api/admin/settings/parameters') && req.method === 'POST') {
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              if (!(global as any).__aripay_system_parameters) {
                (global as any).__aripay_system_parameters = {
                  withdrawal_fee: 2500,
                  min_withdrawal: 20000,
                  max_withdrawal: 10000000,
                  min_deposit: 10000,
                  maintenance_mode: false,
                  gateway_timeout_seconds: 30,
                };
              }

              const current = (global as any).__aripay_system_parameters;
              if (data.withdrawal_fee !== undefined) current.withdrawal_fee = Number(data.withdrawal_fee);
              if (data.min_withdrawal !== undefined) current.min_withdrawal = Number(data.min_withdrawal);
              if (data.max_withdrawal !== undefined) current.max_withdrawal = Number(data.max_withdrawal);
              if (data.min_deposit !== undefined) current.min_deposit = Number(data.min_deposit);
              if (data.maintenance_mode !== undefined) current.maintenance_mode = Boolean(data.maintenance_mode);
              if (data.gateway_timeout_seconds !== undefined) current.gateway_timeout_seconds = Number(data.gateway_timeout_seconds);

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: 'Parameter operasional sistem berhasil diperbarui.',
                  data: current,
                })
              );
            } catch (e: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'Format data parameter tidak valid.' }));
            }
          });
          return;
        }

        // LANGKAH 6.8: GET /api/admin/settings/health
        if (req.url && req.url.startsWith('/api/admin/settings/health') && req.method === 'GET') {
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              timestamp: new Date().toISOString(),
              database: {
                status: 'CONNECTED',
                latency_ms: 11 + Math.floor(Math.random() * 8),
                server_version: 'PostgreSQL 16.2 (Cloud Run Container)',
              },
              gateway: {
                name: 'Digiflazz PPOB API Gateway v1',
                status: 'ONLINE',
                latency_ms: 38 + Math.floor(Math.random() * 15),
                endpoint: 'https://api.digiflazz.com/v1',
              },
            })
          );
          return;
        }

        // ========================================================
        // LANGKAH 6.10: MANAJEMEN PRODUK & KONTROL MARGIN HARGA
        // ========================================================
        if (req.url && req.url.startsWith('/api/admin/products')) {
          const authHeader = req.headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Akses ditolak: Autentikasi Admin diperlukan.' }));
            return;
          }

          if (!(global as any).__aripay_products) {
            (global as any).__aripay_products = [
              { id: 1, sku_code: 'TSEL10', name: 'Pulsa Telkomsel 10.000', category: 'PULSA', brand: 'Telkomsel', price_cost: 10200, price_sell: 11500, margin: 1300, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 2, sku_code: 'TSEL25', name: 'Pulsa Telkomsel 25.000', category: 'PULSA', brand: 'Telkomsel', price_cost: 25100, price_sell: 26500, margin: 1400, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 3, sku_code: 'TSELDATA10', name: 'Paket Data Telkomsel 10GB', category: 'DATA', brand: 'Telkomsel', price_cost: 32000, price_sell: 35000, margin: 3000, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 4, sku_code: 'PLN50', name: 'Token Listrik PLN 50.000', category: 'PLN', brand: 'PLN', price_cost: 50000, price_sell: 50500, margin: 500, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 5, sku_code: 'ISAT25', name: 'Pulsa Indosat 25.000', category: 'PULSA', brand: 'Indosat', price_cost: 24900, price_sell: 26000, margin: 1100, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 6, sku_code: 'GOPAY50', name: 'Saldo GoPay 50.000', category: 'EMONEY', brand: 'GoPay', price_cost: 50000, price_sell: 51500, margin: 1500, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 7, sku_code: 'PLN100', name: 'Token Listrik PLN 100.000', category: 'PLN', brand: 'PLN', price_cost: 100000, price_sell: 100500, margin: 500, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 8, sku_code: 'DANA25', name: 'Saldo DANA 25.000', category: 'EMONEY', brand: 'DANA', price_cost: 25000, price_sell: 26500, margin: 1500, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 9, sku_code: 'OVO50', name: 'Saldo OVO 50.000', category: 'EMONEY', brand: 'OVO', price_cost: 50000, price_sell: 51500, margin: 1500, is_active: false, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
              { id: 10, sku_code: 'XL50', name: 'Pulsa XL Axiata 50.000', category: 'PULSA', brand: 'XL', price_cost: 49500, price_sell: 51000, margin: 1500, is_active: true, created_at: '2026-09-01 08:00:00', updated_at: '2026-09-09 10:00:00' },
            ];
          }

          const products: any[] = (global as any).__aripay_products;
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;

          // 1. PATCH /api/admin/products/:id/status
          if (pathname.match(/^\/api\/admin\/products\/\d+\/status$/) && req.method === 'PATCH') {
            const match = pathname.match(/^\/api\/admin\/products\/(\d+)\/status$/);
            const id = match ? parseInt(match[1], 10) : 0;
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const idx = products.findIndex((p) => p.id === id);
                if (idx === -1) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Produk tidak ditemukan.' }));
                  return;
                }
                const nextState = Boolean(parsed.is_active);
                products[idx].is_active = nextState;
                products[idx].updated_at = new Date().toISOString();
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  message: `Status produk '${products[idx].name}' berhasil diubah menjadi ${nextState ? 'AKTIF' : 'NONAKTIF'}.`,
                  data: products[idx],
                }));
              } catch (e: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: e.message }));
              }
            });
            return;
          }

          // 2. PUT /api/admin/products/:id
          if (pathname.match(/^\/api\/admin\/products\/\d+$/) && req.method === 'PUT') {
            const match = pathname.match(/^\/api\/admin\/products\/(\d+)$/);
            const id = match ? parseInt(match[1], 10) : 0;
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const idx = products.findIndex((p) => p.id === id);
                if (idx === -1) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, message: 'Produk tidak ditemukan.' }));
                  return;
                }

                const current = products[idx];
                const cost = parsed.price_cost !== undefined ? Number(parsed.price_cost) : current.price_cost;
                const sell = parsed.price_sell !== undefined ? Number(parsed.price_sell) : current.price_sell;

                if (cost <= 0) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'Harga modal harus lebih besar dari 0.' }));
                  return;
                }
                if (sell < cost) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'Proteksi Margin: Harga jual tidak boleh lebih rendah dari harga modal.' }));
                  return;
                }

                products[idx] = {
                  ...current,
                  name: parsed.name !== undefined ? parsed.name.trim() : current.name,
                  category: parsed.category !== undefined ? parsed.category.trim().toUpperCase() : current.category,
                  brand: parsed.brand !== undefined ? parsed.brand.trim() : current.brand,
                  price_cost: cost,
                  price_sell: sell,
                  margin: sell - cost,
                  is_active: parsed.is_active !== undefined ? Boolean(parsed.is_active) : current.is_active,
                  updated_at: new Date().toISOString(),
                };

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  message: `Detail produk '${products[idx].name}' (${products[idx].sku_code}) berhasil diperbarui.`,
                  data: products[idx],
                }));
              } catch (e: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: e.message }));
              }
            });
            return;
          }

          // 3. POST /api/admin/products (Tambah Produk Baru)
          if (pathname === '/api/admin/products' && req.method === 'POST') {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const { sku_code, name, category, brand, price_cost, price_sell, is_active = true } = parsed;

                if (!sku_code || !name || !category || !brand || price_cost === undefined || price_sell === undefined) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'Kode SKU, nama produk, kategori, brand, harga modal, dan harga jual wajib diisi.' }));
                  return;
                }

                const cleanSku = sku_code.trim().toUpperCase();
                const cost = Number(price_cost);
                const sell = Number(price_sell);

                if (cost <= 0) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'Harga modal harus lebih besar dari 0.' }));
                  return;
                }
                if (sell < cost) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'Proteksi Margin: Harga jual tidak boleh lebih rendah dari harga modal.' }));
                  return;
                }

                if (products.some((p) => p.sku_code === cleanSku)) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 409;
                  res.end(JSON.stringify({ success: false, message: `Kode SKU '${cleanSku}' sudah terdaftar dalam sistem.` }));
                  return;
                }

                const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
                const newProduct = {
                  id: nextId,
                  sku_code: cleanSku,
                  name: name.trim(),
                  category: category.trim().toUpperCase(),
                  brand: brand.trim(),
                  price_cost: cost,
                  price_sell: sell,
                  margin: sell - cost,
                  is_active: Boolean(is_active),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                products.push(newProduct);

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 201;
                res.end(JSON.stringify({
                  success: true,
                  message: `Produk '${newProduct.name}' (${newProduct.sku_code}) berhasil ditambahkan ke etalase katalog.`,
                  data: newProduct,
                }));
              } catch (e: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: e.message }));
              }
            });
            return;
          }

          // 4. GET /api/admin/products (Daftar Produk dengan Filter & Pagination)
          if (pathname === '/api/admin/products' && req.method === 'GET') {
            const category = urlObj.searchParams.get('category') || '';
            const brand = urlObj.searchParams.get('brand') || '';
            const status = urlObj.searchParams.get('status') || '';
            const search = urlObj.searchParams.get('search') || '';
            const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
            const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

            let filtered = [...products];

            if (category && category !== 'ALL') {
              filtered = filtered.filter((p) => p.category.toUpperCase() === category.toUpperCase());
            }
            if (brand && brand !== 'ALL') {
              filtered = filtered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
            }
            if (status && status !== 'ALL') {
              const wantActive = status === 'ACTIVE' || status === 'true';
              filtered = filtered.filter((p) => p.is_active === wantActive);
            }
            if (search && search.trim()) {
              const q = search.trim().toLowerCase();
              filtered = filtered.filter((p) =>
                p.sku_code.toLowerCase().includes(q) ||
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q)
              );
            }

            const totalRecords = filtered.length;
            const totalPages = Math.ceil(totalRecords / limit) || 1;
            const startIndex = (page - 1) * limit;
            const pageData = filtered.slice(startIndex, startIndex + limit);

            const activeCount = products.filter((p) => p.is_active).length;
            const inactiveCount = products.filter((p) => !p.is_active).length;
            const avgMargin = products.length > 0
              ? products.reduce((sum, p) => sum + (p.price_sell - p.price_cost), 0) / products.length
              : 0;

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              summary: {
                total_products: products.length,
                active_products: activeCount,
                inactive_products: inactiveCount,
                average_margin: Math.round(avgMargin),
              },
              pagination: {
                current_page: page,
                per_page: limit,
                total_records: totalRecords,
                total_pages: totalPages,
              },
              count: pageData.length,
              data: pageData,
            }));
            return;
          }
        }

        // =====================================================================
        // LANGKAH 6.11: Transaksi Real PPOB, Webhook Gateway, & Auto-Refund
        // =====================================================================

        // Inisialisasi state global untuk transaksi & mutasi
        if (!(global as any).__aripay_live_transactions) {
          (global as any).__aripay_live_transactions = [
            {
              id: 101,
              invoice_number: 'INV-20260909-001',
              user_id: 1,
              user_name: 'Budi Santoso',
              product_id: 3,
              product_name: 'Paket Data Telkomsel 10GB',
              product_sku: 'TSELDATA10',
              target_number: '081234567890',
              price: 35000,
              price_cost: 32000,
              margin: 3000,
              supplier: 'DIGIFLAZZ',
              status: 'SUCCESS',
              sn_token: 'SN-TSEL-89283719283',
              created_at: '2026-09-09 10:20:00',
            },
          ];
        }
        if (!(global as any).__aripay_refund_references) {
          (global as any).__aripay_refund_references = new Set<string>();
        }

        const liveTxs: any[] = (global as any).__aripay_live_transactions;
        const refundRefs: Set<string> = (global as any).__aripay_refund_references;

        // 1. POST /api/transactions/create
        if (req.url && req.url.startsWith('/api/transactions/create') && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const { product_id, target_number } = JSON.parse(body || '{}');
              if (!product_id || !target_number) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Parameter product_id dan target_number wajib diisi.' }));
                return;
              }

              const allProducts: any[] = (global as any).__aripay_products || [];
              const product = allProducts.find((p) => p.id === Number(product_id));
              if (!product) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, message: 'Produk tidak ditemukan dalam etalase katalog.' }));
                return;
              }

              if (!product.is_active) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: `Produk '${product.name}' sedang dinonaktifkan.` }));
                return;
              }

              const priceSell = Number(product.price_sell);
              const priceCost = Number(product.price_cost);
              const margin = priceSell - priceCost;

              // Ambil saldo mock user
              const userBalance = 150000; // Mock saldo awal
              if (userBalance < priceSell) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Saldo tidak mencukupi untuk melakukan transaksi ini.' }));
                return;
              }

              const nextId = liveTxs.length > 0 ? Math.max(...liveTxs.map((t) => t.id)) + 1 : 1;
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
              const invoiceNumber = `INV-${dateStr}-${randomHex}`;

              const newTx = {
                id: nextId,
                invoice_number: invoiceNumber,
                user_id: 1,
                user_name: 'Budi Santoso',
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku_code,
                target_number: String(target_number).trim(),
                price: priceSell,
                price_cost: priceCost,
                margin: margin,
                supplier: 'DIGIFLAZZ',
                status: 'PENDING',
                sn_token: null,
                failure_reason: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              liveTxs.unshift(newTx);

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 201;
              res.end(JSON.stringify({
                success: true,
                message: `Pemesanan ${product.name} berhasil dibuat. Sedang diproses oleh provider.`,
                data: {
                  ...newTx,
                  user_balance_after: userBalance - priceSell,
                },
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: err.message }));
            }
          });
          return;
        }

        // 2. GET /api/transactions/my
        if (req.url && req.url.startsWith('/api/transactions/my') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            count: liveTxs.length,
            data: liveTxs,
          }));
          return;
        }

        // 3. POST /api/webhook/digiflazz
        if (req.url && req.url.startsWith('/api/webhook/digiflazz') && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const signature = req.headers['x-digiflazz-signature'] || req.headers['x-hub-signature'];
              if (!signature) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 401;
                res.end(JSON.stringify({
                  success: false,
                  message: 'Akses ditolak: Header signature webhook (x-digiflazz-signature) wajib disertakan.',
                }));
                return;
              }

              const secretKey = process.env.DIGIFLAZZ_WEBHOOK_SECRET || 'aripay_digiflazz_secret_2026';
              const computedHash = crypto.createHmac('sha256', secretKey).update(body).digest('hex');
              const computedBuf = Buffer.from(computedHash.toLowerCase(), 'utf8');
              const sigBuf = Buffer.from(String(signature).toLowerCase(), 'utf8');

              if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 401;
                res.end(JSON.stringify({
                  success: false,
                  message: 'Akses ditolak: Validasi signature webhook Digiflazz gagal (Unauthorized).',
                }));
                return;
              }

              const payload = JSON.parse(body || '{}');
              const data = payload.data || payload;
              const invoiceNumber = data.ref_id || payload.ref_id || payload.invoice_number;
              const rawStatus = (data.status || payload.status || '').toString().toLowerCase();
              const snToken = data.sn || payload.sn || payload.sn_token || null;
              const failureReason = data.message || payload.message || payload.failure_reason || 'Transaksi dibatalkan/gagal dari operator.';

              if (!invoiceNumber) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'invoice_number / ref_id wajib disertakan.' }));
                return;
              }

              const tx = liveTxs.find((t) => t.invoice_number === invoiceNumber);
              if (!tx) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, message: 'Transaksi tidak ditemukan.' }));
                return;
              }

              const isSuccess = ['sukses', 'success', '00', 'berhasil'].includes(rawStatus);
              const isFailed = ['gagal', 'failed', 'batal', 'rejected'].includes(rawStatus);

              if (isSuccess) {
                if (tx.status === 'PENDING') {
                  tx.status = 'SUCCESS';
                  tx.sn_token = snToken || `SN-${Date.now()}`;
                  tx.updated_at = new Date().toISOString();
                }
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  message: `Transaksi ${tx.invoice_number} berhasil diselesaikan (SUCCESS).`,
                  data: tx,
                }));
                return;
              }

              if (isFailed) {
                const refundRef = `REFUND:${tx.invoice_number}`;
                const alreadyRefunded = refundRefs.has(refundRef);

                if (tx.status === 'PENDING') {
                  tx.status = 'REFUNDED';
                  tx.failure_reason = failureReason;
                  tx.updated_at = new Date().toISOString();
                  refundRefs.add(refundRef);
                }

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  message: alreadyRefunded
                    ? 'Callback diterima. Transaksi sudah di-refund sebelumnya (Idempotent OK).'
                    : `Transaksi ${tx.invoice_number} berstatus FAILED. Saldo Rp${tx.price.toLocaleString('id-ID')} telah dikembalikan secara otomatis.`,
                  data: {
                    invoice_number: tx.invoice_number,
                    status: tx.status,
                    refund_reference: refundRef,
                  },
                }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Status PENDING dicatat.' }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: err.message }));
            }
          });
          return;
        }

        // 4. POST /api/admin/webhook/simulate
        if (req.url && req.url.startsWith('/api/admin/webhook/simulate') && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const { type, invoice_number, status, sn_token, failure_reason } = JSON.parse(body || '{}');
              const tx = liveTxs.find((t) => t.invoice_number === invoice_number);
              if (!tx) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, message: 'Transaksi tidak ditemukan.' }));
                return;
              }

              if (status === 'SUCCESS') {
                if (tx.status === 'PENDING') {
                  tx.status = 'SUCCESS';
                  tx.sn_token = sn_token || `SN-SIM-${Date.now()}`;
                  tx.updated_at = new Date().toISOString();
                }
              } else if (status === 'FAILED') {
                const refundRef = `REFUND:${tx.invoice_number}`;
                if (tx.status === 'PENDING') {
                  tx.status = 'REFUNDED';
                  tx.failure_reason = failure_reason || 'Simulasi kegagalan operator';
                  tx.updated_at = new Date().toISOString();
                  refundRefs.add(refundRef);
                }
              }

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: `Simulasi webhook ${status} berhasil diproses untuk ${invoice_number}.`,
                data: tx,
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), aripayApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
