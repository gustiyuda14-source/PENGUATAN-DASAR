// Bank soal: satu generator per Paket. Soal dibangkitkan acak tiap sesi, bukan hardcode.

export function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// Ambil n item unik acak dari arr, tanpa ubah arr aslinya.
export function sample(arr, n) {
    const copy = arr.slice();
    const out = [];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
        const idx = rand(0, copy.length - 1);
        out.push(copy[idx]);
        copy.splice(idx, 1);
    }
    return out;
}

export const PAKET_META = [
    {
        id: 1, title: 'Pasangan Cermin Perkalian', desc: 'Cari faktor cermin (jumlah 10) buat hitung cepat', total: 50,
        previewTags: ['3↔7', '2↔8', '1↔9', '4↔6', '5↔5']
    },
    {
        id: 2, title: 'Dekomposisi Perkalian', desc: 'Pecah perkalian besar jadi mental math', total: 50,
        previewTags: ['8×92', '14×37', '63×81', '45×52', '77×89']
    },
    {
        id: 3, title: 'Sederhanakan Pecahan', desc: 'FPB & bentuk pecahan paling sederhana', total: 50,
        previewTags: ['4/6', '12/18', '9/15', '21/42', '30/60']
    }
];

// Paket 1: pasangan cermin ke-10 (3-7, 2-8, 1-9, 4-6, 5-5)
export function generatePaket1(total = 50) {
    const out = [];
    for (let i = 1; i <= total; i++) {
        const base = rand(3, 9);
        const multiplier = rand(11, 49);
        const target = base * multiplier;
        const mirrorBase = 10 - base;
        const ans = mirrorBase * multiplier;
        out.push({
            text: `Jika ${base} × n = ${target},<br>maka ${mirrorBase} × n = ?`,
            ans: ans.toString(),
            bahas: `n = ${target}/${base} = ${multiplier}. Maka ${mirrorBase} × ${multiplier} = ${ans}`
        });
    }
    return out;
}

// Paket 2: Dekomposisi perkalian
export function generatePaket2(total = 50) {
    const out = [];
    for (let i = 1; i <= total; i++) {
        let n1, n2;
        if (i <= total * 0.2) { n1 = rand(7, 9); n2 = rand(80, 99); }
        else if (i <= total * 0.5) { n1 = rand(11, 19); n2 = rand(21, 49); }
        else { n1 = rand(37, 99); n2 = rand(41, 99); }
        const ans = n1 * n2;
        const n2Round = Math.ceil(n2 / 10) * 10;
        const diff = n2Round - n2;
        const bahas = diff <= 3
            ? `${n1} × (${n2Round} - ${diff}) = ${n1 * n2Round} - ${n1 * diff} = ${ans}`
            : `${n1} × (${n2 - (n2 % 10)} + ${n2 % 10}) = ${ans}`;
        out.push({ text: `${n1} × ${n2} = ?`, ans: ans.toString(), bahas: `Dekomposisi: ${bahas}` });
    }
    return out;
}

// Paket 3: Sederhanakan pecahan — cuma 2 tingkat, medium lalu hard (gak ada easy/ekstrem)
export function generatePaket3(total = 50) {
    const out = [];
    for (let i = 1; i <= total; i++) {
        const mult = i <= total / 2 ? rand(5, 15) : rand(16, 30);
        let p, q;
        do { p = rand(1, 9); q = rand(p + 1, 12); } while (gcd(p, q) !== 1);
        const num = p * mult, den = q * mult;
        out.push({
            text: `Sederhanakan:<br>${num} / ${den}`,
            ans: { p: p.toString(), q: q.toString() },
            bahas: `Bongkar penyebut: ${den} = ${q} × ${mult}. Pembilang: ${num} / ${mult} = ${p}.`
        });
    }
    return out;
}

const GENERATORS = { 1: generatePaket1, 2: generatePaket2, 3: generatePaket3 };

export function generatePaket(id) {
    return GENERATORS[id]();
}
