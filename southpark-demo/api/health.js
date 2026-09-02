export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    business: 'Southpark Investments',
    ownerEmail: process.env.OWNER_EMAIL || 'info.spam@gmail.com',
  });
}
