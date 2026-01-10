import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Poppins for premium look
Font.register({
    family: 'Poppins',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf', fontWeight: 400 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-italic.ttf', fontWeight: 400, fontStyle: 'italic' },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-600-normal.ttf', fontWeight: 600 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf', fontWeight: 700 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-900-normal.ttf', fontWeight: 900 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-900-italic.ttf', fontWeight: 900, fontStyle: 'italic' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Poppins',
        backgroundColor: '#FFFFFF',
        color: '#1a1a1a',
        position: 'relative'
    },
    sidebarBlue: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 35,
        backgroundColor: '#0026e3',
        zIndex: 10,
        borderLeft: '2pt solid #001999'
    },
    contentWrapper: {
        padding: '30 60 30 50',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        gap: 20,
    },
    logo: {
        width: 60,
        height: 60,
        objectFit: 'contain'
    },
    firmaText: {
        fontSize: 32,
        fontWeight: 900,
        color: '#D4AF37',
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: 800,
        color: '#1e293b',
        textTransform: 'uppercase',
        marginTop: 5,
        letterSpacing: 0.5
    },
    dateDisplay: {
        fontSize: 10,
        fontWeight: 600,
        color: '#64748b',
        marginTop: 4
    },
    section: {
        marginBottom: 25
    },
    propertyBox: {
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderLeft: '4pt solid #0026e3',
        marginBottom: 20
    },
    label: {
        fontSize: 11,
        fontWeight: 900,
        color: '#1e293b',
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 11,
        fontWeight: 500,
        color: '#0026e3'
    },
    text: {
        fontSize: 11,
        lineHeight: 1.8,
        textAlign: 'justify',
        color: '#334155'
    },
    bold: {
        fontWeight: 800,
        color: '#0f172a'
    },
    signatureSection: {
        marginTop: 60,
        alignItems: 'center'
    },
    signatureLine: {
        width: 250,
        borderBottom: '1.5pt solid #1e293b',
        marginBottom: 10
    },
    signatureName: {
        fontSize: 12,
        fontWeight: 900,
        color: '#0026e3',
        textTransform: 'uppercase'
    },
    signatureRole: {
        fontSize: 10,
        fontWeight: 700,
        color: '#64748b',
        marginTop: 2
    },
    footerLine: {
        position: 'absolute',
        bottom: 30,
        left: 50,
        right: 65,
        borderTop: '0.5pt solid #cbd5e1',
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    footerIconText: {
        fontSize: 8,
        color: '#64748b',
    },
    watermark: {
        position: 'absolute',
        top: '30%',
        left: '20%',
        width: 400,
        height: 400,
        opacity: 0.03,
        zIndex: -2
    }
});

interface KeyReceiptPDFProps {
    data: any;
}

const KeyReceiptPDF: React.FC<KeyReceiptPDFProps> = ({ data }) => {
    const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const ownerName = data.ownerName || data.contact_name || data.name || 'Propietario';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.sidebarBlue} />
                <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.watermark} />

                <View style={styles.contentWrapper}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.logo} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.firmaText}>FIRMA</Text>
                            <Text style={styles.headerTitle}>Responsiva de Llaves</Text>
                            <Text style={styles.dateDisplay}>Guadalajara, Jalisco a {date}</Text>
                        </View>
                    </View>

                    {/* Property Information Section */}
                    <View style={styles.propertyBox}>
                        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                            <Text style={[styles.label, { width: 100 }]}>Propiedad:</Text>
                            <Text style={styles.value}>{data.title?.toUpperCase() || 'S/N'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <Text style={[styles.label, { width: 100 }]}>Folio Ref:</Text>
                            <Text style={styles.value}>{data.ref || 'PENDIENTE'}</Text>
                        </View>
                    </View>

                    {/* Main Body */}
                    <View style={styles.section}>
                        <Text style={styles.text}>
                            A través de la presente carta responsiva, yo <Text style={styles.bold}>{ownerName}</Text> hago constar que <Text style={styles.bold}>ALEJANDRO RIVAS GIRON</Text> recibe de mi entera satisfacción las llaves de la propiedad ubicada en:
                        </Text>
                    </View>

                    <View style={[styles.section, { padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, textAlign: 'center' }]}>
                        <Text style={[styles.bold, { fontSize: 13, color: '#1e293b' }]}>{data.address || 'Domicilio no especificado'}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.text}>
                            Así mismo, bajo protesta de decir verdad, comunico que los documentos de identidad presentados son legítimos y faculto a <Text style={styles.bold}>MAGNO GRUPO INMOBILIARIO</Text> para la promoción y acceso controlado de prospectos perfilados a dicho inmueble.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.text}>
                            Me comprometo a mantener una comunicación estrecha para la logística de visitas, asumiendo la responsabilidad sobre la veracidad de la información legal proporcionada.
                        </Text>
                    </View>

                    {/* Signatures */}
                    <View style={styles.signatureSection}>
                        <Text style={[styles.label, { marginBottom: 60, fontSize: 10 }]}>Atentamente</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>ALEJANDRO RIVAS GIRON</Text>
                        <Text style={styles.signatureRole}>Director de Operaciones</Text>
                        <Text style={[styles.signatureRole, { fontSize: 8 }]}>MAGNO GRUPO INMOBILIARIO</Text>
                    </View>
                </View>

                {/* Footer Line */}
                <View style={styles.footerLine}>
                    <Text style={styles.footerIconText}>📞 (33) 1952 7172</Text>
                    <Text style={styles.footerIconText}>✉️ seguimientoinmo@gmail.com</Text>
                    <Text style={[styles.footerIconText, { flex: 1 }]}>📍 Av. Mariano Otero 810, Guadalajara, Jal.</Text>
                </View>

            </Page>
        </Document>
    );
};

export default KeyReceiptPDF;
