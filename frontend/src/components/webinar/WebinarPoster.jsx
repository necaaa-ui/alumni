import React from "react";
import necLogo from "../../assets/NEC-college Logo.png";
import posterFooter from "../../assets/poster-footer.jpg";
import founderLogo from "../../assets/rigth - Founder-Logo.png";
import "./WebinarPoster.css";

// Add API base URL - even though not used in this component
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WebinarPoster({
  alumniPhoto,
  webinarTopic,
  webinarDate,
  webinarTime,
  webinarVenue,
  alumniName,
  alumniDesignation,
  alumniCompany,
  alumniCity,
  alumniBatch,
  alumniDepartment,
  webinarDomain = '',
  desktopPreview = false
}) {

  const departmentText = `${webinarDomain} ${alumniDepartment}`.toUpperCase();
  const hasDepartment = (pattern) => new RegExp(`(?:^|[^A-Z])${pattern}(?:$|[^A-Z])`).test(departmentText);
  const posterBackgroundColor = hasDepartment('AIDS') || departmentText.includes('ARTIFICIAL INTELLIGENCE') || departmentText.includes('AI & DS')
    ? '#C026D3'
    : hasDepartment('CSE') || departmentText.includes('COMPUTER SCIENCE')
      ? '#064E3B'
      : hasDepartment('MECH') || departmentText.includes('MECHANICAL')
      ? '#B8860B'
      : hasDepartment('ECE') || departmentText.includes('ELECTRONICS')
        ? '#EA580C'
        : hasDepartment('EEE') || departmentText.includes('ELECTRICAL')
            ? '#0F766E'
            : hasDepartment('CIVIL')
              ? '#7F1D3D'
              : '#06204A';

  // ---------- FUNCTION TO GET WEEKDAY ----------
  const getDayFromDate = (dateString) => {
    const date = new Date(dateString);
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY"
    ];
    return days[date.getDay()];
  };

  const dayName = getDayFromDate(webinarDate);

  return (
    <div
      className={`webinar-poster w-[900px] h-[1200px] mx-auto relative text-white overflow-hidden shadow-2xl rounded-xl ${desktopPreview ? 'desktop-preview' : ''}`}
      style={{ backgroundColor: posterBackgroundColor }}
    >

      {/* -------------------- TOP HEADER -------------------- */}
      <div className="text-center pt-6">
        <h1 className="text-5xl font-extrabold text-white drop-shadow-lg mt-4">
          NATIONAL ENGINEERING COLLEGE
        </h1>
        <p className="text-xl mt-2">
          (AN AUTONOMOUS INSTITUTION - AFFILIATED TO ANNA UNIVERSITY, CHENNAI)
        </p>
        <p className="text-xl">K.R. NAGAR, KOVILPATTI - 628503</p>
      </div>

      {/* -------------------- LOGOS -------------------- */}
      <div className="flex justify-between px-10 mt-5">
        <img src={necLogo} alt="NEC Logo" className="w-30 h-30 object-contain" />

        <div className="flex justify-center mt-4">
          <div className="bg-white text-[#06204A] font-extrabold flex justify-center text-3xl px-5 h-[55px] w-[450px] rounded-sm shadow-md flex items-center">
            <span className="association-title" style={{ position: 'relative', top: '-1px', lineHeight: 1 }}>
              NEC ALUMNI ASSOCIATION
            </span>
          </div>
        </div>

        <img src={founderLogo} alt="Founder" className="w-38 h-38 object-contain rounded-full" />
      </div>

      {/* -------------------- ORGANIZES WEBINAR -------------------- */}
      <div className="text-center mt-0">
        <p className="italic text-2xl">ORGANIZES</p>
        <p className="italic text-2xl">WEBINAR ON</p>
      </div>

      {/* Right dots */}
      <div className="absolute right-4 top-80 space-y-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-200 rounded-full opacity-80 mb-4"
          ></div>
        ))}
      </div>

      {/* -------------------- TOPIC -------------------- */}
      <h1 className="absolute top-[400px] left-10 w-[820px] text-center text-4xl font-bold leading-tight text-cyan-200 drop-shadow-lg px-10">
        {webinarTopic}
      </h1>

      {/* -------------------- DATE / TIME / VENUE -------------------- */}
      <div className="absolute top-[630px] left-10 text-[#07419e] text-3xl font-semibold space-y-8">

        {/* DATE */}
        <div className="group bg-white/80 hover:bg-white transition-all duration-300 
                        backdrop-blur-sm shadow-lg hover:shadow-2xl 
                        rounded-2xl px-8 py-5 border-l-8 border-blue-700 
                        hover:scale-[1.03] cursor-pointer w-[400px] h-[110px]">

          <p className="flex items-center gap-4 text-4xl font-extrabold text-blue-900 
                       group-hover:text-blue-700 transition-all duration-300 mt-4">
            📅 {dayName}
          </p>

          <p className="ml-5 text-black text-3xl font-bold mt-2 mb-2 group-hover:text-[#0a2a57] transition-all duration-300">
            {webinarDate}
          </p>
        </div>

        {/* TIME */}
        <div className="group bg-white/80 hover:bg-white transition-all duration-300 
                        backdrop-blur-sm shadow-lg hover:shadow-2xl 
                        rounded-2xl px-8 py-5 border-l-8 border-blue-700 
                        hover:scale-[1.03] cursor-pointer w-[400px] h-[110px]">

          <p className="flex items-center gap-4 text-4xl font-extrabold text-blue-900 
                       group-hover:text-blue-700 transition-all duration-300 mt-4">
            ⏰ TIME
          </p>

          <p className="text-black text-3xl font-bold mt-3 mb-2 group-hover:text-[#0a2a57] transition-all duration-300">
            {webinarTime}
          </p>
        </div>

        {/* VENUE */}
        <div className="group bg-white/80 hover:bg-white transition-all duration-300 
                        backdrop-blur-sm shadow-lg hover:shadow-2xl 
                        rounded-2xl px-8 py-5 border-l-8 border-blue-700 
                        hover:scale-[1.03] cursor-pointer w-[400px] h-[110px]">

          <p className="flex items-center gap-4 text-4xl font-extrabold text-blue-900 
                       group-hover:text-blue-700 transition-all duration-300 mt-4">
            📍 VENUE
          </p>

          <p className="ml-5 text-black text-3xl font-bold mt-2 mb-2 leading-tight break-words group-hover:text-[#0a2a57] transition-all duration-300">
            {webinarVenue}
          </p>
        </div>
      </div>

      {/* -------------------- ALUMNI PHOTO -------------------- */}
      <div className="absolute top-[620px] right-15">
        <div className="speaker-photo-placeholder relative w-80 h-85 rounded-full border-4 border-white">
          {alumniPhoto && (
          <img
            src={alumniPhoto}
            alt="Alumni"
            crossOrigin="anonymous"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
            className="absolute inset-0 w-full h-full rounded-full object-cover"
          />
          )}
        </div>
      </div>

      {/* -------------------- ALUMNI DETAILS -------------------- */}
      <div className="absolute top-[900px] right-10 bg-black/95 h-[250px] w-[370px] p-5 rounded-xl text-center">
        <h2 className="text-3xl font-bold mt-1 leading-tight">{alumniName}</h2>

        <p className="text-green-400 text-2xl mt-2 leading-snug">
          {alumniDesignation} <br />
          {alumniCompany}, {alumniCity}
        </p>

        <p className="text-lg mt-3 leading-tight">
          ( BATCH {alumniBatch} – {alumniDepartment})
        </p>
      </div>

      {/* -------------------- FOOTER -------------------- */}
      <div className="absolute bottom-0 w-full">
        <img
          src={posterFooter}
          alt="Footer Banner"
          className="w-full object-cover"
        />
      </div>
    </div>
  );
}