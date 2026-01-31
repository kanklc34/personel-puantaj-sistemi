let seciliTarih = new Date();
let veriler = JSON.parse(localStorage.getItem("staffTrackData")) || {
    calisanlar: [],
    gunlukHareketler: {}
};
let seciliId = null;

document.addEventListener("DOMContentLoaded", () => {
    temaYukle(); 
    tarihiGoster();
    ekraniGuncelle();
});

function temaDegistir() {
    // Body yerine document.documentElement kullanıyoruz
    const htmlTag = document.documentElement;
    const currentTheme = htmlTag.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    htmlTag.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    // İkonu güncelle
    const ikon = document.getElementById("tema-ikon");
    ikon.className = newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

function temaYukle() {
    const savedTheme = localStorage.getItem("theme") || "light";
    
    // Hem HTML etiketini hem de ikonu başlangıçta ayarla
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    const ikon = document.getElementById("tema-ikon");
    if(ikon) {
        ikon.className = savedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}

function getTarihKey() {
    const offset = seciliTarih.getTimezoneOffset() * 60000;
    const local = new Date(seciliTarih.getTime() - offset);
    return local.toISOString().split('T')[0];
}

function tarihiGoster() {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById("bugun-tarih").innerText = seciliTarih.toLocaleDateString('tr-TR', options);
    // Input değerini güncelle
    document.getElementById("tarih-secici").value = getTarihKey();
}

function tarihDegistir(gun) {
    seciliTarih.setDate(seciliTarih.getDate() + gun);
    tarihiGoster();
    ekraniGuncelle();
}

// Artık sadece input tetikleniyor, CSS ile gizledik
function takvimiAc() { 
    const picker = document.getElementById("tarih-secici");
    
    // Modern tarayıcılarda takvimi zorla açar
    if (picker.showPicker) {
        picker.showPicker(); 
    } else {
        // Eski telefonlar için yedek yöntem
        picker.focus();
        picker.click();
    }
}

function takvimdenGit() { 
    // Inputtan tarihi al
    const secilen = document.getElementById("tarih-secici").value;
    if(secilen) {
        seciliTarih = new Date(secilen); 
        tarihiGoster(); 
        ekraniGuncelle(); 
    }
}

function ekraniGuncelle() {
    const liste = document.getElementById("liste-alani");
    const bosMesaj = document.getElementById("bos-durum");
    liste.innerHTML = "";
    
    if (veriler.calisanlar.length === 0) {
        bosMesaj.style.display = "block";
        document.getElementById("gunluk-maliyet").innerText = "0 ₺";
        return;
    } else {
        bosMesaj.style.display = "none";
    }

    const key = getTarihKey();
    let gunlukMaliyet = 0;

    if (!veriler.gunlukHareketler[key]) veriler.gunlukHareketler[key] = {};

    veriler.calisanlar.forEach(isci => {
        const gunVerisi = veriler.gunlukHareketler[key][isci.id] || { durum: "yok", not: "" };
        
        if (gunVerisi.durum === "tam") gunlukMaliyet += parseInt(isci.ucret);
        if (gunVerisi.durum === "yarim") gunlukMaliyet += (parseInt(isci.ucret) / 2);

        const hakedis = hesaplaHakedis(isci.id);
        const odenen = isci.toplamOdenen || 0;
        const netDurum = hakedis - odenen;
        const gunSayisi = hesaplaGun(isci.id);

        let durumYazisi = "";
        let durumRenk = "";

        if (netDurum > 0) {
            durumYazisi = `Alacağı Var: ${netDurum.toLocaleString()} ₺`;
            durumRenk = "text-yesil"; 
        } else if (netDurum < 0) {
            durumYazisi = `Fazla Ödeme: ${Math.abs(netDurum).toLocaleString()} ₺`;
            durumRenk = "text-kirmizi"; 
        } else {
            durumYazisi = "Hesap Tam (0 ₺)";
            durumRenk = "text-gri";
        }

        liste.innerHTML += `
        <div class="isci-kart">
            <div class="kart-ust">
                <div class="sol" style="display:flex; align-items:center;">
                    <div class="avatar">${isci.isim.substring(0,2).toUpperCase()}</div>
                    <div class="bilgi">
                        <h3>${isci.isim}</h3>
                        <p>${isci.gorev} • ${gunSayisi} Gün</p>
                    </div>
                </div>
                <div class="ayarlar">
                    <button onclick="duzenleModalAc(${isci.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="silOnayAc(${isci.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            
            <div class="aksiyonlar">
                <button onclick="durumDegistir(${isci.id}, 'tam')" class="btn-durum var ${gunVerisi.durum==='tam'?'aktif':''}">Tam</button>
                <button onclick="durumDegistir(${isci.id}, 'yarim')" class="btn-durum yarim ${gunVerisi.durum==='yarim'?'aktif':''}">Yarım</button>
                <button onclick="durumDegistir(${isci.id}, 'izinli')" class="btn-durum izinli ${gunVerisi.durum==='izinli'?'aktif':''}">İzin</button>
                <button onclick="durumDegistir(${isci.id}, 'yok')" class="btn-durum yok ${gunVerisi.durum==='yok'?'aktif':''}">Yok</button>
            </div>
            
            <div class="kart-alt">
                <div class="bakiye-bilgi ${durumRenk}">${durumYazisi}</div>
                <button onclick="islemModalAc(${isci.id})" class="btn-hesap">Hesap Gör</button>
            </div>
        </div>`;
    });

    document.getElementById("gunluk-maliyet").innerText = gunlukMaliyet.toLocaleString() + " ₺";
    kaydet();
}

function durumDegistir(id, durum) {
    const key = getTarihKey();
    if (veriler.gunlukHareketler[key][id]?.durum === durum) {
        veriler.gunlukHareketler[key][id].durum = "yok";
    } else {
        veriler.gunlukHareketler[key][id] = { durum: durum, not: veriler.gunlukHareketler[key][id]?.not || "" };
    }
    ekraniGuncelle();
}

function kaydet() { localStorage.setItem("staffTrackData", JSON.stringify(veriler)); }

function hesaplaHakedis(id) {
    let toplam = 0;
    const isci = veriler.calisanlar.find(x => x.id === id);
    if(!isci) return 0;
    Object.values(veriler.gunlukHareketler).forEach(gun => {
        if(gun[id]?.durum === "tam") toplam += parseInt(isci.ucret);
        if(gun[id]?.durum === "yarim") toplam += (parseInt(isci.ucret) / 2);
    });
    return toplam;
}

function hesaplaGun(id) {
    let gun = 0;
    Object.values(veriler.gunlukHareketler).forEach(g => {
        if(g[id]?.durum === "tam") gun++;
        if(g[id]?.durum === "yarim") gun += 0.5;
    });
    return gun;
}

function modalAc(id) { document.getElementById(id).style.display = "flex"; }
function modalKapat(id) { document.getElementById(id).style.display = "none"; }

function ekleModalAc() { modalAc("ekle-modal"); document.getElementById("yeni-ad").value=""; document.getElementById("yeni-ucret").value=""; }
function ekleModalKapat() { modalKapat("ekle-modal"); }
function yeniCalisanKaydet() {
    const ad = document.getElementById("yeni-ad").value;
    const ucret = parseInt(document.getElementById("yeni-ucret").value);
    const gorev = document.getElementById("yeni-gorev").value || "Personel";
    if(!ad || !ucret) return toast("Eksik bilgi girdiniz!");
    veriler.calisanlar.push({ id: Date.now(), isim: ad, gorev: gorev, ucret: ucret, toplamOdenen: 0 });
    ekleModalKapat(); ekraniGuncelle(); toast("Personel Eklendi");
}

function duzenleModalAc(id) {
    seciliId = id;
    const isci = veriler.calisanlar.find(x => x.id === id);
    document.getElementById("duz-ad").value = isci.isim;
    document.getElementById("duz-gorev").value = isci.gorev;
    document.getElementById("duz-ucret").value = isci.ucret;
    modalAc("duzenle-modal");
}
function duzenleModalKapat() { modalKapat("duzenle-modal"); }
function duzenleKaydet() {
    const isci = veriler.calisanlar.find(x => x.id === seciliId);
    isci.isim = document.getElementById("duz-ad").value;
    isci.gorev = document.getElementById("duz-gorev").value;
    isci.ucret = parseInt(document.getElementById("duz-ucret").value);
    duzenleModalKapat(); ekraniGuncelle(); toast("Güncellendi");
}

function silOnayAc(id) { seciliId = id; modalAc("onay-modal"); }
function onayKapat() { modalKapat("onay-modal"); }
function silmeIsleminiTamamla() {
    veriler.calisanlar = veriler.calisanlar.filter(x => x.id !== seciliId);
    onayKapat(); ekraniGuncelle(); toast("Silindi");
}

function islemModalAc(id) {
    seciliId = id;
    const isci = veriler.calisanlar.find(x => x.id === id);
    const key = getTarihKey();
    
    document.getElementById("islem-ad").innerText = isci.isim;
    document.getElementById("islem-not").value = veriler.gunlukHareketler[key]?.[id]?.not || "";
    document.getElementById("odeme-miktar").value = "";

    const hakedis = hesaplaHakedis(id);
    const odenen = isci.toplamOdenen || 0;
    const kalan = hakedis - odenen;
    
    document.getElementById("ozet-hakedis").innerText = hakedis.toLocaleString() + " ₺";
    document.getElementById("ozet-odenen").innerText = odenen.toLocaleString() + " ₺";
    
    const bakiyeEl = document.getElementById("ozet-kalan");
    const etiketEl = document.getElementById("bakiye-etiket");
    
    if (kalan > 0) {
        etiketEl.innerText = "ÖDENMESİ GEREKEN";
        bakiyeEl.innerText = kalan.toLocaleString() + " ₺";
        bakiyeEl.style.color = "var(--success)";
    } else if (kalan < 0) {
        etiketEl.innerText = "PERSONELİN BORCU";
        bakiyeEl.innerText = Math.abs(kalan).toLocaleString() + " ₺";
        bakiyeEl.style.color = "var(--danger)";
    } else {
        etiketEl.innerText = "HESAP KAPALI";
        bakiyeEl.innerText = "0 ₺";
        bakiyeEl.style.color = "var(--text-light)";
    }
    modalAc("islem-modal");
}
function islemModalKapat() { modalKapat("islem-modal"); }

function notKaydet() {
    const key = getTarihKey();
    if (!veriler.gunlukHareketler[key][seciliId]) veriler.gunlukHareketler[key][seciliId] = { durum: "yok" };
    veriler.gunlukHareketler[key][seciliId].not = document.getElementById("islem-not").value;
    kaydet(); toast("Not Kaydedildi"); islemModalKapat();
}

function odemeYap() {
    const miktar = parseFloat(document.getElementById("odeme-miktar").value);
    if (!miktar) return toast("Tutar giriniz");
    const isci = veriler.calisanlar.find(x => x.id === seciliId);
    isci.toplamOdenen = (isci.toplamOdenen || 0) + miktar;
    ekraniGuncelle(); islemModalKapat(); toast("Kayıt Başarılı");
}

function excelModalAc() { modalAc("excel-modal"); }
function excelModalKapat() { modalKapat("excel-modal"); }
function excelIndir(tip) {
    // Kütüphane kontrolü
    if (typeof XLSX === 'undefined') {
        alert("Excel kütüphanesi (SheetJS) yüklenemedi! Sayfayı yenileyin.");
        return;
    }

    let veriSatirlari = [];
    let dosyaAdi = "";
    
    // Excel Başlığı (En üst satır)
    let baslikSatiri = [["PERSONEL TAKİP SİSTEMİ - " + getTarihKey()]]; 

    if (tip === 'gunluk') {
        dosyaAdi = `Gunluk_Liste_${getTarihKey()}.xlsx`; // Uzantı .xlsx oldu
        
        // Sütun Başlıkları
        veriSatirlari.push(["Tarih", "Ad Soyad", "Görevi", "Durum", "Günlük Ücret", "Not"]);

        veriler.calisanlar.forEach(p => {
            const d = veriler.gunlukHareketler[getTarihKey()]?.[p.id] || {durum:"yok"};
            
            let durumYazi = d.durum === 'tam' ? 'Tam Gün' : 
                            d.durum === 'yarim' ? 'Yarım Gün' : 
                            d.durum === 'izinli' ? 'İzinli' : 'Gelmedi';

            veriSatirlari.push([
                getTarihKey(),
                p.isim,
                p.gorev,
                durumYazi,
                parseInt(p.ucret), // Sayı formatında gönderiyoruz
                d.not || ""
            ]);
        });

    } else if (tip === 'genel') {
        dosyaAdi = "Genel_Bakiye_Listesi.xlsx";
        
        veriSatirlari.push(["Ad Soyad", "Görevi", "Toplam Hakediş", "Toplam Ödenen", "Kalan Bakiye"]);

        veriler.calisanlar.forEach(p => {
            const h = hesaplaHakedis(p.id);
            const o = p.toplamOdenen || 0;
            const b = h - o;
            // Sayıları direkt sayı olarak gönderiyoruz ki Excel'de toplanabilsin
            veriSatirlari.push([p.isim, p.gorev, h, o, b]);
        });

    } else if (tip === 'aylik') {
        const secilenYil = seciliTarih.getFullYear();
        const secilenAy = seciliTarih.getMonth();
        const ayIsmi = seciliTarih.toLocaleDateString('tr-TR', { month: 'long' });
        
        dosyaAdi = `Aylik_Ozet_${ayIsmi}_${secilenYil}.xlsx`;

        veriSatirlari.push(["Ad Soyad", "Görevi", `${ayIsmi} Çalışma (Gün)`, `${ayIsmi} Kazanç (TL)`, "Genel Bakiye (TL)"]);

        veriler.calisanlar.forEach(p => {
            let aylikGun = 0;
            let aylikKazanc = 0;

            Object.keys(veriler.gunlukHareketler).forEach(tarihStr => {
                const [yil, ay, gun] = tarihStr.split('-').map(Number);
                if (yil === secilenYil && (ay - 1) === secilenAy) {
                    const durum = veriler.gunlukHareketler[tarihStr][p.id]?.durum;
                    if (durum === 'tam') { aylikGun += 1; aylikKazanc += parseInt(p.ucret); }
                    else if (durum === 'yarim') { aylikGun += 0.5; aylikKazanc += (parseInt(p.ucret) / 2); }
                }
            });

            const h = hesaplaHakedis(p.id);
            const o = p.toplamOdenen || 0;
            const b = h - o;

            veriSatirlari.push([p.isim, p.gorev, aylikGun, aylikKazanc, b]);
        });
    }

    // --- SHEETJS İLE OLUŞTURMA ---
    
    // 1. Yeni bir kitap oluştur
    const workbook = XLSX.utils.book_new();

    // 2. Verileri birleştir (Başlık + Boşluk + Tablo)
    const tumVeri = [...baslikSatiri, [], ...veriSatirlari];

    // 3. Veriyi sayfaya çevir
    const worksheet = XLSX.utils.aoa_to_sheet(tumVeri);

    // 4. Sütun Genişliklerini Ayarla (Göz kararı estetik)
    worksheet['!cols'] = [
        {wch: 15}, // A
        {wch: 25}, // B (İsim uzun olabilir)
        {wch: 20}, // C
        {wch: 15}, // D
        {wch: 15}, // E
        {wch: 30}  // F (Notlar)
    ];

    // 5. Kitaba ekle ve dosyayı yaz
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
    XLSX.writeFile(workbook, dosyaAdi);
    
    excelModalKapat();
}

function toast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.style.display = "block";
    setTimeout(() => { t.style.display = "none"; }, 3000);
}