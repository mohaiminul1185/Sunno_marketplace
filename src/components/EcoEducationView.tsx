import React from 'react';
import { ActiveTab } from '../types';
import { HERO_ARTISAN_IMG, SYLHET_TEA_IMG, RANGAMATI_HANDLOOM_IMG } from '../data/mockData';

interface EcoEducationViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectDistrict: (district: string) => void;
}

export const EcoEducationView: React.FC<EcoEducationViewProps> = ({
  setActiveTab,
  onSelectDistrict,
}) => {
  const standards = [
    {
      num: '01',
      title: 'Zero Harmful Chemicals & Toxins',
      desc: 'All products must be free from synthetic pesticides, petroleum plastics, heavy metal glazes, and hazardous artificial dyes. We mandate botanical and mineral pigments.',
      icon: 'spa',
    },
    {
      num: '02',
      title: 'Locally Sourced from 64 Districts',
      desc: 'Raw materials must be grown, harvested, or reclaimed within Bangladesh. This keeps transportation carbon emissions near zero and enriches village economies.',
      icon: 'pin_drop',
    },
    {
      num: '03',
      title: 'Fair Living Wage & Ethical Trade',
      desc: 'Artisans receive direct fair compensation well above regional minimums. We prioritize women-led cooperatives and traditional hereditary master craftspeople.',
      icon: 'groups',
    },
    {
      num: '04',
      title: 'Circular & Biodegradable End-of-Life',
      desc: 'Every item is evaluated for end-of-life impact. We verify home compostability, natural decomposition, or lifetime durable heirloom recyclability.',
      icon: 'recycling',
    },
    {
      num: '05',
      title: 'Cultural Heritage Preservation',
      desc: 'Protecting ancient Bangladeshi craftsmanship—from Jamdani handloom and Nakshi Kantha to Shital Pati bamboo weaving and Dhamrai bell-metal casting.',
      icon: 'history_edu',
    },
  ];

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-10 flex flex-col gap-14">
      {/* Hero */}
      <section className="flex flex-col lg:flex-row items-center gap-10">
        <div className="flex-1 space-y-4">
          <span className="px-3.5 py-1 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full border border-[#a0f399] uppercase tracking-wide">
            Our Sustainability Charter
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#002c11] font-heading leading-tight">
            The SUNNO 5-Point Eco-Verification Standard
          </h1>
          <p className="text-base text-[#414941] leading-relaxed">
            In a world flooded with greenwashing, SUNNO establishes Bangladesh's first verified artisan accreditation framework. Every piece is traced from seed to loom, riverbed silt to master potter.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('districts')}
              className="px-6 py-3 bg-[#002c11] text-white rounded-full font-bold text-sm hover:bg-[#0d4421] transition-colors shadow-md"
            >
              Shop Verified Products
            </button>
          </div>
        </div>

        <div className="flex-1 aspect-[4/3] rounded-2xl overflow-hidden ambient-shadow border border-[#c1c9be]">
          <img
            src={HERO_ARTISAN_IMG}
            alt="Artisans at work in Bangladesh"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* 5 Points Grid */}
      <section className="space-y-6">
        <div className="border-b border-[#c1c9be] pb-4">
          <h2 className="text-2xl font-bold text-[#002c11] font-heading">
            The 5 Pillars of Our Verification Standard
          </h2>
          <p className="text-sm text-[#414941] mt-1">
            How our independent verification committee audits every single listing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {standards.map((s) => (
            <div
              key={s.num}
              className="bg-white p-6 rounded-2xl border border-[#c1c9be] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="w-10 h-10 rounded-xl bg-[#f5fbf6] text-[#1b6d24] flex items-center justify-center border border-[#a0f399]">
                    <span className="material-symbols-outlined text-[22px]">
                      {s.icon}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-[#717970]">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#002c11] font-heading mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-[#414941] leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#c1c9be]/40 text-[11px] font-semibold text-[#1b6d24] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Rigorous Laboratory & Field Audit
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Districts Spotlight */}
      <section className="bg-[#f5f3f3] p-8 md:p-12 rounded-3xl border border-[#c1c9be] flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-[#002c11] font-heading">
            Artisanal Geography of Bangladesh
          </h2>
          <p className="text-sm text-[#414941] mt-1">
            Click a historic craft center to explore its local sustainable cooperatives:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => {
              onSelectDistrict('Sylhet');
              setActiveTab('districts');
            }}
            className="bg-white p-4 rounded-xl border border-[#c1c9be] text-left hover:border-[#002c11] transition-all group"
          >
            <h4 className="font-bold text-sm text-[#002c11] group-hover:text-[#1b6d24]">
              Sylhet & Sreemangal
            </h4>
            <p className="text-xs text-[#414941] mt-1">
              Wild cane weaving & biodynamic single-estate tea gardens.
            </p>
          </button>

          <button
            onClick={() => {
              onSelectDistrict('Rangamati');
              setActiveTab('districts');
            }}
            className="bg-white p-4 rounded-xl border border-[#c1c9be] text-left hover:border-[#002c11] transition-all group"
          >
            <h4 className="font-bold text-sm text-[#002c11] group-hover:text-[#1b6d24]">
              Rangamati & Hill Tracts
            </h4>
            <p className="text-xs text-[#414941] mt-1">
              Tribal backstrap loomed textiles with organic forest root dyes.
            </p>
          </button>

          <button
            onClick={() => {
              onSelectDistrict('Bagerhat (Sundarbans)');
              setActiveTab('districts');
            }}
            className="bg-white p-4 rounded-xl border border-[#c1c9be] text-left hover:border-[#002c11] transition-all group"
          >
            <h4 className="font-bold text-sm text-[#002c11] group-hover:text-[#1b6d24]">
              Sundarbans Biosphere
            </h4>
            <p className="text-xs text-[#414941] mt-1">
              Ethical wild hive honey harvest & reclaimed mangrove woodcrafts.
            </p>
          </button>
        </div>
      </section>
    </main>
  );
};
