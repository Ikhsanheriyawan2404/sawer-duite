package service

import (
	"fmt"
	"strings"
)

type QRISService struct{}

func NewQRISService() *QRISService {
	return &QRISService{}
}

// GenerateDynamicQRIS converts static QRIS to dynamic with amount
func (s *QRISService) GenerateDynamicQRIS(staticQRIS string, amount int) (string, error) {
	// 1. Convert Static to Dynamic (Tag 01: 11 -> 12)
	payload := strings.Replace(staticQRIS, "010211", "010212", 1)

	// 2. Remove existing CRC (Tag 63)
	// Tag 63 is always at the end: 6304 + 4 chars CRC
	if index := strings.LastIndex(payload, "6304"); index != -1 {
		payload = payload[:index]
	}

	// 3. Inject Amount (Tag 54)
	amountStr := fmt.Sprintf("%d", amount)
	tag54 := fmt.Sprintf("54%02d%s", len(amountStr), amountStr)
	
	// We should check if Tag 54 already exists or where to insert.
	// In most QRIS, we can append it before the CRC.
	payload += tag54

	// 4. Append Tag 63 prefix for CRC calculation
	payload += "6304"

	// 5. Calculate CRC16 CCITT (False)
	crc := s.calcCRC16(payload)
	
	// 6. Final Payload
	return payload + crc, nil
}

// calcCRC16 implements CRC16-CCITT (Polynomial: 0x1021, Init: 0xFFFF)
func (s *QRISService) calcCRC16(data string) string {
	var crc uint16 = 0xFFFF
	polynomial := uint16(0x1021)

	for _, b := range []byte(data) {
		crc ^= uint16(b) << 8
		for i := 0; i < 8; i++ {
			if (crc & 0x8000) != 0 {
				crc = (crc << 1) ^ polynomial
			} else {
				crc <<= 1
			}
		}
	}

	return fmt.Sprintf("%04X", crc)
}
