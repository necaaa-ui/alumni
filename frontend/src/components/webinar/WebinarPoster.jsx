import React from "react";
import necLogo from "../../assets/NEC-college Logo.png";
import posterFooter from "../../assets/poster-footer.jpg";
import founderLogo from "../../assets/rigth - Founder-Logo.png";
import "./WebinarPoster.css";

const isLocalDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (isLocalDev ? 'http://localhost:5000' : '/alumnimain')
).replace(/\/$/, '');

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
  desktopPreview = false
}) {

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

  const resolveImageUrl = (value) => {
    if (!value) return null;

    const trimmedValue = String(value).trim();
    if (!trimmedValue) return null;

    // Handle blob URLs (used by file input preview in speaker assignment form)
    if (trimmedValue.startsWith('blob:')) {
      return trimmedValue;
    }

    // Handle standard absolute URLs (http/https) and data URIs
    if (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith('data:')) {
      return trimmedValue;
    }

    // Handle application-root paths such as /alumnimain/uploads/photo.jpg
    if (trimmedValue.startsWith('/')) {
      return trimmedValue;
    }

    // Resolve "uploads/filename" relative to the API base
    if (trimmedValue.startsWith('uploads/')) {
      return `${API_BASE_URL}/${trimmedValue}`;
    }

    // Use the API speaker-photos endpoint for raw filenames.
    // This is the default resolution when the parent component passes a plain
    // filename without a path prefix (e.g., "1784865136682.jpeg").
    const photoFileName = trimmedValue.split('/').filter(Boolean).pop();
    if (photoFileName) {
      return `${API_BASE_URL}/api/speaker-photos/${encodeURIComponent(photoFileName)}`;
    }

    // Final fallback: try the traditional /uploads/ path with the raw value
    return `${API_BASE_URL}/uploads/${trimmedValue}`;
  };

  const resolvedAlumniPhoto = resolveImageUrl(alumniPhoto);
  const photoInitials = (alumniName || 'ALUMNI')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className={`webinar-poster w-[900px] h-[1200px] mx-auto bg-[#06204A] relative text-white overflow-hidden shadow-2xl rounded-xl ${desktopPreview ? 'desktop-preview' : ''}`}>

      {/* -------------------- TOP HEADER -------------------- */}
      <div className="text-center pt-6">
        <h1 className="text-5xl font-extrabold text-purple-300 drop-shadow-lg mt-4">
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
          <div className="bg-white text-[#06204A] font-extrabold  flex justify-center text-3xl px-5 h-[55px] w-[450px] rounded-sm shadow-md flex items-center">
            NEC ALUMNI ASSOCIATION
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

      {/* -------------------- ANGLED WHITE AREA -------------------- */}
      <div className="absolute top-[320px] left-[-300px] w-[180%] h-[850px] bg-gray-200 rotate-[745deg] origin-left shadow-2xl"></div>
      {/* -------------------- TOPIC -------------------- */}
      <h1 className="text-center text-4xl font-bold text-blue-300 mt-4 drop-shadow-md px-10">
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

          <p className="text-black text-3xl font-bold mt-3 mb-2 group-hover:text-[#0a2a57] transition-all duration-300">
            {webinarVenue}
          </p>
        </div>
      </div>

      {/* -------------------- ALUMNI PHOTO -------------------- */}
      <div className="absolute top-[540px] right-15">
        {resolvedAlumniPhoto ? (
          <img
            src={resolvedAlumniPhoto}
            alt="Alumni"
            className="w-80 h-85 rounded-full object-cover border-4 border-white shadow-xl"
          />
        ) : (
          <div className="w-80 h-85 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-5xl font-bold text-white">
            {photoInitials || 'A'}
          </div>
        )}
      </div>

      {/* -------------------- ALUMNI DETAILS -------------------- */}
      <div className="absolute top-[880px] right-10 bg-black/95 h-[250px] w-[370px]  p-6 rounded-xl text-center ">
        <h2 className="text-3xl font-bold mt-2">{alumniName}</h2>

        <p className="text-green-400 text-2xl mt-1 leading-snug">
          {alumniDesignation} <br />
          {alumniCompany}, {alumniCity}
        </p>

        <p className="text-lg mt-3">
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
